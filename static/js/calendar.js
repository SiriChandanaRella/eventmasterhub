// Calendar-specific JavaScript for EventMasterHub

document.addEventListener('DOMContentLoaded', function() {
    // Calendar utility functions
    window.CalendarUtils = {
        // Format date for display
        formatDate: function(date) {
            return new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        },

        // Format time for display
        formatTime: function(date) {
            return new Date(date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        // Get event color based on category
        getEventColor: function(category) {
            const colors = {
                'Technology': '#0d6efd',
                'Business': '#198754',
                'Education': '#ffc107',
                'Entertainment': '#dc3545',
                'Sports': '#fd7e14',
                'Health': '#20c997',
                'General': '#6c757d'
            };
            return colors[category] || '#6c757d';
        },

        // Get event color based on registration status
        getEventColorByStatus: function(registrationCount, capacity) {
            const percentage = (registrationCount / capacity) * 100;
            if (percentage >= 100) return '#dc3545'; // Full - Red
            if (percentage >= 80) return '#ffc107';  // Nearly full - Yellow
            if (percentage >= 50) return '#fd7e14';  // Half full - Orange
            return '#198754'; // Available - Green
        },

        // Create event tooltip content
        createTooltipContent: function(event) {
            return `
                <div class="tooltip-event">
                    <h6>${event.title}</h6>
                    <p><i class="fas fa-map-marker-alt"></i> ${event.location}</p>
                    <p><i class="fas fa-clock"></i> ${this.formatTime(event.start)}</p>
                    <p><i class="fas fa-tag"></i> ${event.category}</p>
                </div>
            `;
        },

        // Mini calendar for date picker
        createMiniCalendar: function(containerId, onDateSelect) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const firstDay = new Date(currentYear, currentMonth, 1).getDay();

            let calendarHTML = '<div class="mini-calendar">';
            calendarHTML += '<div class="mini-calendar-header">';
            calendarHTML += `<h6>${today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h6>`;
            calendarHTML += '</div>';
            calendarHTML += '<div class="mini-calendar-grid">';

            // Day headers
            const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            dayHeaders.forEach(day => {
                calendarHTML += `<div class="mini-calendar-day-header">${day}</div>`;
            });

            // Empty cells for days before the first day of the month
            for (let i = 0; i < firstDay; i++) {
                calendarHTML += '<div class="mini-calendar-day empty"></div>';
            }

            // Days of the month
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(currentYear, currentMonth, day);
                const isToday = date.toDateString() === today.toDateString();
                const classes = ['mini-calendar-day'];
                if (isToday) classes.push('today');

                calendarHTML += `<div class="${classes.join(' ')}" data-date="${date.toISOString().split('T')[0]}">${day}</div>`;
            }

            calendarHTML += '</div></div>';
            container.innerHTML = calendarHTML;

            // Add click handlers
            container.querySelectorAll('.mini-calendar-day:not(.empty)').forEach(dayEl => {
                dayEl.addEventListener('click', function() {
                    const date = this.getAttribute('data-date');
                    if (onDateSelect) onDateSelect(date);
                });
            });
        },

        // Filter events by date range
        filterEventsByDateRange: function(events, startDate, endDate) {
            return events.filter(event => {
                const eventDate = new Date(event.start);
                return eventDate >= startDate && eventDate <= endDate;
            });
        },

        // Group events by date
        groupEventsByDate: function(events) {
            const grouped = {};
            events.forEach(event => {
                const date = new Date(event.start).toDateString();
                if (!grouped[date]) {
                    grouped[date] = [];
                }
                grouped[date].push(event);
            });
            return grouped;
        },

        // Create agenda view
        createAgendaView: function(events, containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const groupedEvents = this.groupEventsByDate(events);
            const sortedDates = Object.keys(groupedEvents).sort((a, b) => new Date(a) - new Date(b));

            let agendaHTML = '<div class="agenda-view">';
            
            sortedDates.forEach(date => {
                const dateEvents = groupedEvents[date];
                agendaHTML += '<div class="agenda-date">';
                agendaHTML += `<h5>${this.formatDate(date)}</h5>`;
                agendaHTML += '<div class="agenda-events">';
                
                dateEvents.forEach(event => {
                    agendaHTML += `
                        <div class="agenda-event" style="border-left: 4px solid ${this.getEventColor(event.category)}">
                            <div class="agenda-event-time">${this.formatTime(event.start)}</div>
                            <div class="agenda-event-title">${event.title}</div>
                            <div class="agenda-event-location">${event.location}</div>
                        </div>
                    `;
                });
                
                agendaHTML += '</div></div>';
            });
            
            agendaHTML += '</div>';
            container.innerHTML = agendaHTML;
        },

        // Export calendar events
        exportEvents: function(events, format = 'ics') {
            if (format === 'ics') {
                return this.exportToICS(events);
            } else if (format === 'csv') {
                return this.exportToCSV(events);
            }
        },

        // Export to ICS format
        exportToICS: function(events) {
            let icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//EventMasterHub//Calendar//EN'
            ];

            events.forEach(event => {
                const startDate = new Date(event.start);
                const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours default
                
                icsContent.push('BEGIN:VEVENT');
                icsContent.push(`UID:${event.id}@eventmasterhub.com`);
                icsContent.push(`DTSTART:${this.formatDateForICS(startDate)}`);
                icsContent.push(`DTEND:${this.formatDateForICS(endDate)}`);
                icsContent.push(`SUMMARY:${event.title}`);
                icsContent.push(`DESCRIPTION:${event.description || ''}`);
                icsContent.push(`LOCATION:${event.location}`);
                icsContent.push('END:VEVENT');
            });

            icsContent.push('END:VCALENDAR');
            return icsContent.join('\r\n');
        },

        // Export to CSV format
        exportToCSV: function(events) {
            const headers = ['Title', 'Date', 'Time', 'Location', 'Category', 'Description'];
            const rows = [headers.join(',')];

            events.forEach(event => {
                const date = new Date(event.start);
                const row = [
                    `"${event.title}"`,
                    `"${this.formatDate(date)}"`,
                    `"${this.formatTime(date)}"`,
                    `"${event.location}"`,
                    `"${event.category}"`,
                    `"${event.description || ''}"`
                ];
                rows.push(row.join(','));
            });

            return rows.join('\n');
        },

        // Format date for ICS
        formatDateForICS: function(date) {
            return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        },

        // Download file
        downloadFile: function(content, filename, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    // Initialize calendar-specific features
    const calendarContainer = document.getElementById('calendar');
    if (calendarContainer) {
        // Add calendar view toggle buttons
        const viewToggle = document.createElement('div');
        viewToggle.className = 'btn-group mb-3';
        viewToggle.innerHTML = `
            <button type="button" class="btn btn-outline-secondary" onclick="calendar.changeView('dayGridMonth')">Month</button>
            <button type="button" class="btn btn-outline-secondary" onclick="calendar.changeView('timeGridWeek')">Week</button>
            <button type="button" class="btn btn-outline-secondary" onclick="calendar.changeView('timeGridDay')">Day</button>
            <button type="button" class="btn btn-outline-secondary" onclick="calendar.changeView('listWeek')">List</button>
        `;
        calendarContainer.parentNode.insertBefore(viewToggle, calendarContainer);

        // Add export buttons
        const exportButtons = document.createElement('div');
        exportButtons.className = 'btn-group mb-3 ms-2';
        exportButtons.innerHTML = `
            <button type="button" class="btn btn-outline-info dropdown-toggle" data-bs-toggle="dropdown">
                <i class="fas fa-download me-1"></i>Export
            </button>
            <ul class="dropdown-menu">
                <li><a class="dropdown-item" href="#" onclick="exportCalendar('ics')">
                    <i class="fas fa-calendar me-2"></i>iCalendar (.ics)
                </a></li>
                <li><a class="dropdown-item" href="#" onclick="exportCalendar('csv')">
                    <i class="fas fa-file-csv me-2"></i>CSV File
                </a></li>
            </ul>
        `;
        viewToggle.parentNode.insertBefore(exportButtons, viewToggle.nextSibling);
    }

    // Export calendar function
    window.exportCalendar = function(format) {
        fetch('/api/events')
            .then(response => response.json())
            .then(events => {
                const content = window.CalendarUtils.exportEvents(events, format);
                const filename = `events.${format}`;
                const mimeType = format === 'ics' ? 'text/calendar' : 'text/csv';
                window.CalendarUtils.downloadFile(content, filename, mimeType);
            })
            .catch(error => {
                console.error('Error exporting calendar:', error);
                alert('Error exporting calendar. Please try again.');
            });
    };

    // Create mini calendar widget
    window.CalendarUtils.createMiniCalendar('miniCalendar', function(date) {
        if (window.calendar) {
            window.calendar.gotoDate(date);
        }
    });
});
