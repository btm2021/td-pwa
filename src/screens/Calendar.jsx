import { useState, useEffect } from 'preact/hooks';
import { Icon } from '../components/Icon';
import {
    accountStats,
    pnlHistory,
    formatUSD,
    formatPercent,
    isLoading
} from '../state/account';
import { deviceMode } from '../hooks/useDeviceMode';

// Firebase Form Component
function CalendarForm({ onEntrySaved }) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [pnl, setPnl] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!pnl) return;

        setSaving(true);
        try {
            if (!window.firebase) {
                throw new Error("Firebase not initialized");
            }
            const db = window.firebase.firestore();
            await db.collection('calendar_entries').add({
                date,
                pnl: parseFloat(pnl),
                notes,
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });

            // Clear form
            setPnl('');
            setNotes('');

            if (onEntrySaved) onEntrySaved();
            alert('Trade entry saved to Firebase!');
        } catch (error) {
            console.error('Error saving to Firebase:', error);
            alert('Error saving data: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="calendar-sidebar">
            <form className="calendar-form" onSubmit={handleSubmit}>
                <h3>Add Trade Entry</h3>
                <div className="form-group">
                    <label>Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>PnL Amount ($)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={pnl}
                        onChange={e => setPnl(e.target.value)}
                        placeholder="e.g. 150.50 or -50.00"
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Notes / Strategy</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Enter trade details, emotions, or setup..."
                        rows={4}
                    />
                </div>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                    {saving ? (
                        <>
                            <span className="spinner spinner--small" style={{ marginRight: '8px' }} />
                            Saving...
                        </>
                    ) : (
                        'Save to Firebase'
                    )}
                </button>
            </form>
        </div>
    );
}

export function Calendar() {
    const isDesktop = deviceMode.value === 'desktop';
    const loading = isLoading.value;
    const history = pnlHistory.value;

    // Firebase entries state
    const [dbEntries, setDbEntries] = useState([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Get current month and year
    const now = new Date();
    const [currentMonth, setCurrentMonth] = useState(now.getMonth());
    const [currentYear, setCurrentYear] = useState(now.getFullYear());

    // Fetch from Firebase
    useEffect(() => {
        const fetchFirebaseEntries = async () => {
            if (!window.firebase) return;
            try {
                const db = window.firebase.firestore();
                const snapshot = await db.collection('calendar_entries')
                    .orderBy('date', 'desc')
                    .get();

                const entries = snapshot.docs.map(doc => doc.data());
                setDbEntries(entries);
            } catch (error) {
                console.error("Error fetching from Firestore:", error);
            }
        };

        fetchFirebaseEntries();
    }, [refreshTrigger]);

    // Calendar navigation
    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    // Calendar data processing
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // Map PnL history and DB entries to dates
    const pnlMap = {};

    // Add mock history
    history.forEach(item => {
        pnlMap[item.date] = (pnlMap[item.date] || 0) + item.pnl;
    });

    // Add Firebase entries (these take priority or are added to mock)
    dbEntries.forEach(item => {
        pnlMap[item.date] = (pnlMap[item.date] || 0) + item.pnl;
    });

    // Calculate month stats
    let monthTotalPnl = 0;
    let winningDays = 0;
    let losingDays = 0;
    let bestDay = -Infinity;
    let worstDay = Infinity;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const pnl = pnlMap[dateStr] || 0;

        if (pnl !== 0) {
            monthTotalPnl += pnl;
            if (pnl > 0) {
                winningDays++;
                if (pnl > bestDay) bestDay = pnl;
            } else {
                losingDays++;
                if (pnl < worstDay) worstDay = pnl;
            }
        }
    }

    if (bestDay === -Infinity) bestDay = 0;
    if (worstDay === Infinity) worstDay = 0;

    const winRate = winningDays + losingDays > 0
        ? (winningDays / (winningDays + losingDays)) * 100
        : 0;

    // Render stats
    const stats = [
        { label: 'Net Profit', value: formatUSD(monthTotalPnl), color: monthTotalPnl >= 0 ? 'positive' : 'negative' },
        { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? 'positive' : 'negative' },
        { label: 'Winning Days', value: winningDays, color: 'positive' },
        { label: 'Losing Days', value: losingDays, color: 'negative' },
        { label: 'Best Day', value: formatUSD(bestDay), color: 'positive' },
        { label: 'Worst Day', value: formatUSD(worstDay), color: 'negative' },
    ];

    const handleEntrySaved = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className={`calendar-page ${isDesktop ? 'calendar-page--desktop' : ''}`}>
            <div className="calendar-layout">
                <div className="calendar-main">
                    {/* Header / Stats */}
                    <div className="calendar-header">
                        <div className="calendar-month-selector">
                            <button className="calendar-nav-btn" onClick={prevMonth}>
                                <Icon name="chevronLeft" size={20} />
                            </button>
                            <h2>{monthNames[currentMonth]} {currentYear}</h2>
                            <button className="calendar-nav-btn" onClick={nextMonth}>
                                <Icon name="chevronRight" size={20} />
                            </button>
                        </div>

                        <div className="calendar-stats-grid">
                            {stats.map((stat, i) => (
                                <div key={i} className="calendar-stat-card">
                                    <span className="calendar-stat-label">{stat.label}</span>
                                    <span className={`calendar-stat-value ${stat.color}`}>{stat.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="calendar-container">
                        <div className="calendar-grid-header">
                            <span>Sun</span>
                            <span>Mon</span>
                            <span>Tue</span>
                            <span>Wed</span>
                            <span>Thu</span>
                            <span>Fri</span>
                            <span>Sat</span>
                        </div>
                        <div className="calendar-grid">
                            {/* Empty slots for first week */}
                            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                                <div key={`empty-${i}`} className="calendar-day calendar-day--empty" />
                            ))}

                            {/* Days of the month */}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                                const pnl = pnlMap[dateStr] || 0;
                                const isToday = now.getDate() === day && now.getMonth() === currentMonth && now.getFullYear() === currentYear;

                                return (
                                    <div key={day} className={`calendar-day ${isToday ? 'calendar-day--today' : ''} ${pnl > 0 ? 'calendar-day--win' : pnl < 0 ? 'calendar-day--loss' : ''}`}>
                                        <span className="calendar-day-num">{day}</span>
                                        {pnl !== 0 && (
                                            <div className="calendar-day-pnl">
                                                {formatUSD(pnl)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Form Sidebar */}
                <CalendarForm onEntrySaved={handleEntrySaved} />
            </div>
        </div>
    );
}
