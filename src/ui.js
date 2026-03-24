(function () {
  const APP = (window.SupportShiftApp = window.SupportShiftApp || {});
  const data = APP.data;
  const store = APP.store;

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function formatDate(dateKey, options) {
    return new Intl.DateTimeFormat("en-AU", options).format(new Date(dateKey + "T00:00:00"));
  }

  function formatTime(time) {
    const date = new Date("2026-01-01T" + time + ":00");
    return new Intl.DateTimeFormat("en-AU", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function formatDateTime(isoString) {
    if (!isoString) return "Not recorded";
    return new Intl.DateTimeFormat("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(isoString));
  }

  function formatMinutes(minutes) {
    if (minutes == null) return "Not recorded";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours + "h " + mins + "m";
  }

  function formatDurationFrom(isoString) {
    if (!isoString) return "00:00:00";
    const ms = Math.max(0, Date.now() - new Date(isoString).getTime());
    const seconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return hours + ":" + minutes + ":" + secs;
  }

  function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return [year, month, day].join("-");
  }

  function plusDays(dateKeyValue, days) {
    const date = new Date(dateKeyValue + "T00:00:00");
    date.setDate(date.getDate() + days);
    return dateKey(date);
  }

  function getWeekDays(dateKeyValue) {
    const base = new Date(dateKeyValue + "T00:00:00");
    return Array.from({ length: 7 }, function (_, index) {
      const date = new Date(base);
      date.setDate(base.getDate() + index);
      return date;
    });
  }

  function getWeekRangeLabel(dateKeyValue) {
    const days = getWeekDays(dateKeyValue);
    const first = days[0];
    const last = days[6];
    return (
      new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(first) +
      " - " +
      new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(last)
    );
  }

  function getShiftsForDate(dateKeyValue) {
    return store.state.shifts
      .filter(function (shift) {
        return shift.date === dateKeyValue;
      })
      .sort(function (a, b) {
        return a.startTime.localeCompare(b.startTime);
      });
  }

  function getShiftCountForDate(dateKeyValue) {
    return getShiftsForDate(dateKeyValue).length;
  }

  function renderIcon(name) {
    const icons = {
      menu:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      bell:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18H5l1.2-1.2A2 2 0 0 0 7 15.4V11a5 5 0 1 1 10 0v4.4a2 2 0 0 0 .8 1.6L19 18h-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 20a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      x:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      filter:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18M6 12h12M10 19h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      calendar:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 2v4M16 2v4M3 10h18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      invoice:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 8h6M9 12h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    };
    return icons[name] || "";
  }

  function getCurrentTabLabel() {
    const labels = {
      shift: "Shift",
      tasks: "Tasks",
      notes: "Notes",
      documents: "Documents",
      "client-info": "Client info",
      transport: "Transport",
      allowances: "Allowances",
      sleepover: "Sleepover",
      summary: "Shift summary",
    };
    return labels[store.state.selectedTab] || "Shift";
  }

  function isCompletedStatus(status) {
    return data.STATUS_META[status].kind === "completed";
  }

  function renderStatusBadge(status) {
    const meta = data.STATUS_META[status];
    return '<span class="badge ' + status + '">' + escapeHtml(meta.label) + "</span>";
  }

  function getAutosaveText(type, shiftId, participantId) {
    const autosave = store.state.autosave;
    if (
      autosave.type === type &&
      autosave.shiftId === shiftId &&
      autosave.participantId === (participantId || null) &&
      autosave.savedAt
    ) {
      return "Autosaved just now";
    }
    return "Autosaves while you type";
  }

  function renderShiftCard(shift) {
    const participantNames = shift.participants
      .map(function (entry) {
        return entry.name;
      })
      .join(", ");

    const finishedContent = isCompletedStatus(shift.status)
      ? '<div class="metric-grid">' +
        '<div class="metric-item"><div class="field-label">Planned</div><div>' +
        formatTime(shift.startTime) +
        " - " +
        formatTime(shift.endTime) +
        "</div></div>" +
        '<div class="metric-item"><div class="field-label">Actual worked</div><div>' +
        formatMinutes(shift.workflow.actualWorkedMinutes) +
        "</div></div>" +
        '<div class="metric-item"><div class="field-label">Final status</div><div>' +
        escapeHtml(data.STATUS_META[shift.status].label) +
        "</div></div>" +
        "</div>"
      : '<div class="field-grid">' +
        '<div class="field"><span class="field-label">Date</span><span>' +
        formatDate(shift.date, { weekday: "short", day: "numeric", month: "short" }) +
        "</span></div>" +
        '<div class="field"><span class="field-label">Time</span><span>' +
        formatTime(shift.startTime) +
        " - " +
        formatTime(shift.endTime) +
        "</span></div>" +
        "</div>";

    return (
      '<button class="shift-card ' +
      (shift.status === "in_progress" ? "active-shift-card " : "") +
      (isCompletedStatus(shift.status) ? "simple" : "") +
      '" data-action="open-shift" data-shift-id="' +
      shift.id +
      '">' +
      '<div class="shift-topline"><h3 class="shift-title">' +
      escapeHtml(shift.rosterName) +
      "</h3>" +
      renderStatusBadge(shift.status) +
      "</div>" +
      '<p class="subtle">' +
      escapeHtml(shift.location) +
      "</p>" +
      finishedContent +
      '<div class="field" style="margin-top:0.75rem"><span class="field-label">Participants</span><span>' +
      escapeHtml(participantNames) +
      "</span></div>" +
      "</button>"
    );
  }

  function renderSchedulePage() {
    const todayKey = dateKey(new Date());
    const weekDays = getWeekDays(store.state.activeWeekStartDate);
    const selectedIndex = weekDays.findIndex(function (day) {
      return dateKey(day) === store.state.selectedDate;
    });
    const visibleShiftDays = weekDays.slice(selectedIndex >= 0 ? selectedIndex : 0);
    const filters = store.state.filters.applied;

    function matchesFilters(shift) {
      if (filters.roster && shift.rosterName !== filters.roster) return false;
      if (filters.status && shift.status !== filters.status) return false;
      if (
        filters.client &&
        !shift.participants.some(function (participant) {
          return participant.name === filters.client;
        })
      ) {
        return false;
      }
      return true;
    }

    return (
      '<section class="page-header page-header-compact">' +
      '<h1 class="page-title page-title-compact">Schedule</h1>' +
      '<div class="control-row control-row-tight">' +
      '<button class="ghost-button icon-only-button" data-action="open-filters" aria-label="Filter">' +
      renderIcon("filter") +
      "</button>" +
      '<button class="ghost-button icon-only-button" data-action="placeholder" aria-label="Pay period">' +
      renderIcon("invoice") +
      "</button>" +
      '<button class="ghost-button icon-only-button" data-action="open-calendar" aria-label="Open calendar">' +
      renderIcon("calendar") +
      "</button>" +
      "</div>" +
      "</section>" +
      '<section class="week-controls compact-week-controls">' +
      "<div><strong>" +
      escapeHtml(getWeekRangeLabel(store.state.activeWeekStartDate)) +
      "</strong></div>" +
      "</section>" +
      '<section class="week-carousel" data-week-strip>' +
      '<div class="week-slide" data-week-slide data-week-start="' +
      store.state.activeWeekStartDate +
      '">' +
      weekDays
        .map(function (day) {
          const key = dateKey(day);
          const shiftCount = getShiftCountForDate(key);
          const isToday = key === todayKey;
          const isSelected = key === store.state.selectedDate;
          const weekdayIndex = day.getDay() === 0 ? 6 : day.getDay() - 1;
          const weekdayLabel = ["M", "T", "W", "T", "F", "S", "S"][weekdayIndex];
          const dots = shiftCount === 0 ? "" : shiftCount === 1 ? "•" : "••";
          return (
            '<button class="week-day ' +
            (isSelected ? "active" : "") +
            (isToday ? " today" : "") +
            '" data-action="select-date" data-date="' +
            key +
            '">' +
            '<span class="week-day-label">' +
            escapeHtml(weekdayLabel) +
            '</span><span class="week-day-number">' +
            escapeHtml(new Intl.DateTimeFormat("en-AU", { day: "numeric" }).format(day)) +
            '</span><span class="week-day-dots">' +
            escapeHtml(dots) +
            "</span></button>"
          );
        })
        .join("") +
      "</div>" +
      "</section>" +
      '<section class="schedule-list">' +
      visibleShiftDays
        .map(function (day) {
          const key = dateKey(day);
          const shifts = getShiftsForDate(key).filter(matchesFilters);
          return (
            '<div class="schedule-day-group"><div class="schedule-list-header"><div><h2 class="day-heading">' +
            escapeHtml(
              new Intl.DateTimeFormat("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }).format(day)
            ) +
            '</h2><p class="subtle">' +
            shifts.length +
            (shifts.length === 1 ? " shift" : " shifts") +
            "</p></div></div>" +
            (shifts.length
              ? shifts.map(renderShiftCard).join("")
              : '<div class="empty-state"><span class="subtle">No shifts rostered for this day.</span></div>') +
            "</div>"
          );
        })
        .join("") +
      "</section>"
    );
  }

  function renderShiftOverview(shift) {
    const actions = [];
    if (!shift.workflow.checkedInAt) {
      actions.push(
        '<button class="solid-button prominent-action" data-action="check-in" data-shift-id="' +
          shift.id +
          '">Check in</button>'
      );
    }
    if (shift.workflow.checkedInAt && !shift.workflow.checkedOutAt) {
      actions.push(
        '<button class="solid-button prominent-action" data-action="check-out" data-shift-id="' +
          shift.id +
          '">Check out</button>'
      );
    }

    return (
      (actions.length
        ? '<section class="section-block section-block-tight"><div class="actions-row">' +
          actions.join("") +
          "</div></section>"
        : "") +
      '<section class="section-block section-block-tight"><h3 class="section-title">Shift overview</h3><div class="field-grid compact-grid">' +
      '<div class="field"><span class="field-label">Date</span><span>' +
      formatDate(shift.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) +
      "</span></div>" +
      '<div class="field"><span class="field-label">Time</span><span>' +
      formatTime(shift.startTime) +
      " - " +
      formatTime(shift.endTime) +
      "</span></div>" +
      '<div class="field"><span class="field-label">Break</span><span>' +
      (shift.breakDuration ? shift.breakDuration + " mins" : "None") +
      "</span></div>" +
      '<div class="field"><span class="field-label">Location</span><span>' +
      escapeHtml(shift.location) +
      "</span></div>" +
      '<div class="field"><span class="field-label">Roster</span><span>' +
      escapeHtml(shift.rosterName) +
      "</span></div>" +
      '<div class="field field-span-full"><span class="field-label">Participants</span><span class="simple-name-list">' +
      shift.participants
        .map(function (participant) {
          return '<span>' + escapeHtml(participant.name) + "</span>";
        })
        .join("") +
      "</span></div>" +
      "</div></section>" +
      '<section class="section-block section-block-tight"><h3 class="section-title">About this shift</h3><p class="subtle">' +
      escapeHtml(shift.description) +
      '</p><div class="field"><span class="field-label">Assets</span><span>' +
      escapeHtml(shift.assets.join(", ") || "No assets listed") +
      '</span></div><div class="field"><span class="field-label">Tags</span><span class="tag-list">' +
      shift.tags
        .map(function (tag) {
          return '<span class="tag">' + escapeHtml(tag) + "</span>";
        })
        .join("") +
      "</span></div></section>" +
      (isCompletedStatus(shift.status)
        ? '<section class="section-block section-block-tight"><h3 class="section-title">Finished shift summary</h3><div class="metric-grid">' +
          '<div class="metric-item"><div class="field-label">Planned</div><div>' +
          formatTime(shift.startTime) +
          " - " +
          formatTime(shift.endTime) +
          "</div></div>" +
          '<div class="metric-item"><div class="field-label">Actual worked</div><div>' +
          formatMinutes(shift.workflow.actualWorkedMinutes) +
          "</div></div>" +
          '<div class="metric-item"><div class="field-label">Final status</div><div>' +
          escapeHtml(data.STATUS_META[shift.status].label) +
          "</div></div></div></section>"
        : "")
    );
  }

  function renderTasksTab(shift) {
    return (
      '<section class="section-block section-block-tight"><h3 class="section-title">Tasks</h3><div class="list-stack">' +
      shift.tasks
        .map(function (task) {
          return (
            '<label class="checkbox-row list-item compact-item"><input type="checkbox" data-action="toggle-task" data-shift-id="' +
            shift.id +
            '" data-task-id="' +
            task.id +
            '" ' +
            (task.done ? "checked" : "") +
            " />" +
            escapeHtml(task.title) +
            "</label>"
          );
        })
        .join("") +
      "</div></section>"
    );
  }

  function renderNotesTab(shift) {
    return (
      '<section class="section-block section-block-tight"><div class="section-heading-row"><h3 class="section-title">Client notes</h3><span class="subtle">Tap a participant to view or edit</span></div><div class="list-stack">' +
      shift.participants
        .map(function (participant) {
          const record = shift.notes.clientByParticipant[participant.id];
          const notePreview = record.note ? record.note.slice(0, 60) : "No client note yet";
          return (
            '<button class="list-item-button" data-action="open-client-note" data-shift-id="' +
            shift.id +
            '" data-participant-id="' +
            participant.id +
            '">' +
            '<div class="list-item-button-top"><strong>' +
            escapeHtml(participant.name) +
            '</strong><span class="status-inline ' +
            escapeHtml(record.attendance) +
            '">' +
            escapeHtml(record.attendance === "attended" ? "Attended" : "Not attended") +
            "</span></div>" +
            '<div class="subtle">' +
            escapeHtml(notePreview) +
            "</div></button>"
          );
        })
        .join("") +
      "</div></section>" +
      '<section class="section-block section-block-tight"><h3 class="section-title">General shift notes</h3><button class="list-item-button" data-action="open-general-notes" data-shift-id="' +
      shift.id +
      '"><div class="list-item-button-top"><strong>Open general notes</strong></div><div class="subtle">' +
      escapeHtml(shift.notes.general ? shift.notes.general.slice(0, 80) : "No general shift note yet") +
      "</div></button></section>"
    );
  }

  function renderDocumentsTab(shift) {
    const documentGroups = [
      {
        title: "Shift",
        items: shift.documents,
      },
      {
        title: "Roster / house",
        items: [
          shift.rosterName + " handover sheet",
          shift.location + " communication book",
          "House routines and support instructions",
        ],
      },
      {
        title: "Participants",
        items: shift.participants.map(function (participant) {
          return participant.name + " support profile";
        }),
      },
    ];

    return documentGroups
      .map(function (group) {
        return (
          '<section class="section-block section-block-tight"><h3 class="section-title">' +
          escapeHtml(group.title) +
          '</h3><div class="list-stack">' +
          group.items
            .map(function (item) {
              return (
                '<button class="list-item-button linked-record" data-action="placeholder"><div class="list-item-button-top"><strong>' +
                escapeHtml(item) +
                "</strong></div><div class=\"subtle\">Linked document placeholder</div></button>"
              );
            })
            .join("") +
          "</div></section>"
        );
      })
      .join("");
  }

  function renderClientInfoTab(shift) {
    return (
      '<section class="section-block section-block-tight"><h3 class="section-title">Client info</h3><div class="list-stack">' +
      shift.participants
        .map(function (participant) {
          const accordionKey = shift.id + ":" + participant.id;
          const isOpen = Boolean(store.state.accordions.clientInfo[accordionKey]);
          return (
            '<div class="accordion-item">' +
            '<button class="accordion-trigger" data-action="toggle-client-info" data-shift-id="' +
            shift.id +
            '" data-participant-id="' +
            participant.id +
            '">' +
            '<span>' +
            escapeHtml(participant.name) +
            "</span><span>" +
            (isOpen ? "Hide" : "Show") +
            "</span></button>" +
            (isOpen
              ? '<div class="accordion-content"><div class="field-grid compact-grid">' +
                '<div class="field"><span class="field-label">Program</span><span>' +
                escapeHtml(participant.program) +
                "</span></div>" +
                '<div class="field"><span class="field-label">Representative</span><span>' +
                escapeHtml(participant.representative || "Not listed") +
                "</span></div></div>" +
                '<div class="field" style="margin-top:0.75rem"><span class="field-label">Warnings / important flags</span><span>' +
                escapeHtml(participant.flags.join(", ") || "No warnings listed") +
                '</span></div><div class="field" style="margin-top:0.75rem"><span class="field-label">Contact / representative / carer</span><span>' +
                escapeHtml((participant.contacts || []).join(", ")) +
                '</span></div><div class="field" style="margin-top:0.75rem"><span class="field-label">Emergency contact information</span><span>' +
                escapeHtml((participant.emergencyContacts || []).join(", ")) +
                "</span></div></div>"
              : "") +
            "</div>"
          );
        })
        .join("") +
      "</div></section>"
    );
  }

  function renderTransportTab() {
    return (
      '<section class="section-block section-block-tight"><h3 class="section-title">Transport</h3><p class="subtle">Transport functionality coming soon.</p></section>'
    );
  }

  function renderAllowancesTab(shift) {
    return (
      '<section class="section-block section-block-tight"><div class="section-heading-row"><h3 class="section-title">Allowances</h3><button class="ghost-button button-compact" data-action="open-add-allowance" data-shift-id="' +
      shift.id +
      '">Add allowance</button></div><div class="list-stack">' +
      (shift.allowances.length
        ? shift.allowances
            .map(function (allowance) {
              return (
                '<button class="list-item-button" data-action="edit-allowance" data-shift-id="' +
                shift.id +
                '" data-allowance-id="' +
                allowance.id +
                '"><div class="list-item-button-top"><strong>' +
                escapeHtml(allowance.type) +
                "</strong><span>" +
                escapeHtml(String(allowance.quantity || allowance.amount || "")) +
                " " +
                escapeHtml(allowance.unitLabel || "") +
                '</span></div><div class="subtle">Tap to edit record</div></button>'
              );
            })
            .join("")
        : '<p class="subtle">No allowances recorded yet.</p>') +
      "</div></section>"
    );
  }

  function renderSleepoverTab(shift) {
    if (shift.shiftType !== "sleepover") return "";
    return (
      '<section class="section-block section-block-tight"><h3 class="section-title">Sleepover information</h3><div class="field-grid compact-grid">' +
      '<div class="field"><span class="field-label">Staff room</span><span>' +
      escapeHtml(shift.sleepover.room) +
      "</span></div>" +
      '<div class="field"><span class="field-label">Handover</span><span>' +
      escapeHtml(shift.sleepover.handover) +
      "</span></div></div></section>" +
      '<section class="section-block section-block-tight"><h3 class="section-title">Disturbances</h3><div class="list-stack">' +
      shift.sleepover.disturbances
        .map(function (item) {
          return (
            '<div class="list-item compact-item"><strong>' +
            escapeHtml(item.time) +
            "</strong><div>" +
            escapeHtml(item.note) +
            "</div></div>"
          );
        })
        .join("") +
      "</div></section>"
    );
  }

  function renderSummaryTab(shift) {
    return (
      '<section class="section-block section-block-tight"><h3 class="section-title">Shift summary</h3><div class="metric-grid">' +
      '<div class="metric-item"><div class="field-label">Status</div><div>' +
      escapeHtml(data.STATUS_META[shift.status].label) +
      "</div></div>" +
      '<div class="metric-item"><div class="field-label">Checked in</div><div>' +
      escapeHtml(formatDateTime(shift.workflow.checkedInAt)) +
      "</div></div>" +
      '<div class="metric-item"><div class="field-label">Checked out</div><div>' +
      escapeHtml(formatDateTime(shift.workflow.checkedOutAt)) +
      "</div></div>" +
      '<div class="metric-item"><div class="field-label">Worked time</div><div>' +
      escapeHtml(formatMinutes(shift.workflow.actualWorkedMinutes)) +
      "</div></div>" +
      '<div class="metric-item"><div class="field-label">Tasks done</div><div>' +
      shift.tasks.filter(function (task) {
        return task.done;
      }).length +
      " / " +
      shift.tasks.length +
      "</div></div>" +
      '<div class="metric-item"><div class="field-label">Allowances</div><div>' +
      shift.allowances.length +
      "</div></div>" +
      '<div class="metric-item"><div class="field-label">Documents</div><div>' +
      shift.documents.length +
      "</div></div>" +
      "</div></section>"
    );
  }

  function renderShiftDetail(shift) {
    const tabs = [
      { id: "shift", label: "Shift" },
      { id: "tasks", label: "Tasks" },
      { id: "notes", label: "Notes" },
      { id: "documents", label: "Documents" },
      { id: "client-info", label: "Client info" },
      { id: "transport", label: "Transport" },
      { id: "allowances", label: "Allowances" },
    ];

    if (shift.shiftType === "sleepover") {
      tabs.push({ id: "sleepover", label: "Sleepover" });
    }

    tabs.push({ id: "summary", label: "Shift summary" });

    const tabContent = {
      shift: renderShiftOverview(shift),
      tasks: renderTasksTab(shift),
      notes: renderNotesTab(shift),
      documents: renderDocumentsTab(shift),
      "client-info": renderClientInfoTab(shift),
      transport: renderTransportTab(),
      allowances: renderAllowancesTab(shift),
      sleepover: renderSleepoverTab(shift),
      summary: renderSummaryTab(shift),
    };

    return (
      '<section class="detail-header compact-detail-header">' +
      '<div class="detail-topline">' +
      '<button class="ghost-button button-compact" data-action="back-to-schedule">Back</button>' +
      '<div class="detail-heading"><h1 class="page-title detail-page-title">' +
      escapeHtml(shift.rosterName) +
      '</h1><p class="subtle">' +
      escapeHtml(formatDate(shift.date, { weekday: "long", day: "numeric", month: "short" })) +
      " | " +
      escapeHtml(shift.location) +
      "</p></div></div>" +
      '<div class="tab-scroll"><div class="tab-row tab-row-detail">' +
      tabs
        .map(function (tab) {
          return (
            '<button class="tab-button ' +
            (store.state.selectedTab === tab.id ? "active" : "") +
            '" data-action="select-tab" data-tab="' +
            tab.id +
            '">' +
            escapeHtml(tab.label) +
            "</button>"
          );
        })
        .join("") +
      "</div></div></section>" +
      '<section class="detail-content">' +
      (tabContent[store.state.selectedTab] || tabContent.shift) +
      "</section>"
    );
  }

  function renderPlaceholderPage(title, description) {
    return (
      '<section class="placeholder-page"><h1 class="page-title">' +
      escapeHtml(title) +
      '</h1><p class="subtle">' +
      escapeHtml(description) +
      "</p></section>"
    );
  }

  function renderNotifications() {
    if (!store.state.isNotificationsOpen) return "";
    const items = [
      "Leave approved for next Tuesday.",
      "New evening respite shift published for Saturday.",
      "Shift details changed for tomorrow's clinic escort.",
      "Manager update: bring the new medication folder to Unit 5.",
    ];
    return (
      '<div class="flyout-overlay"><button class="slideout-backdrop" data-action="close-notifications" aria-label="Close notifications"></button><aside class="side-flyout side-flyout-right"><div class="flyout-header"><h2 class="overlay-title">Notifications</h2><button class="ghost-button icon-only-button" data-action="close-notifications" aria-label="Close notifications">' +
      renderIcon("x") +
      '</button></div><div class="notification-list">' +
      items
        .map(function (item, index) {
          return (
            '<button class="notification-record" data-action="placeholder"><strong>Notification ' +
            (index + 1) +
            '</strong><div class="subtle">' +
            escapeHtml(item) +
            "</div></button>"
          );
        })
        .join("") +
      "</div></aside></div>"
    );
  }

  function renderBurgerMenu() {
    if (!store.state.isMenuOpen) return "";
    const page = store.state.currentPage;
    const primaryLinks = [
      ["schedule", "Schedule"],
      ["leave", "Leave"],
      ["availability", "Availability"],
      ["documents", "Documents"],
    ];
    const secondaryLinks = [["settings", "Settings"]];

    return (
      '<div class="menu-overlay"><button class="slideout-backdrop" data-action="close-menu" aria-label="Close menu"></button><aside class="menu-panel"><div class="flyout-header"><h2 class="overlay-title">Menu</h2><button class="ghost-button icon-only-button" data-action="close-menu" aria-label="Close menu">' +
      renderIcon("x") +
      '</button></div><div class="menu-group">' +
      primaryLinks
        .map(function (entry) {
          return (
            '<button class="menu-link ' +
            (page === entry[0] ? "active" : "") +
            '" data-action="go-page" data-page="' +
            entry[0] +
            '">' +
            escapeHtml(entry[1]) +
            "</button>"
          );
        })
        .join("") +
      secondaryLinks
        .map(function (entry) {
          return (
            '<button class="menu-link ' +
            (page === entry[0] ? "active" : "") +
            '" data-action="go-page" data-page="' +
            entry[0] +
            '">' +
            escapeHtml(entry[1]) +
            "</button>"
          );
        })
        .join("") +
      '<a class="menu-link" href="https://example.com/myp" target="_blank" rel="noreferrer">Back to MYP main site</a>' +
      '</div><div class="menu-group" style="margin-top:1rem"><p class="menu-section-title">Actions</p>' +
      '<button class="menu-action secondary-action" data-action="placeholder">Flexible shift check-in</button>' +
      '<button class="menu-action secondary-action" data-action="placeholder">Log Q time</button>' +
      '<button class="menu-action secondary-action" data-action="placeholder">Log off</button>' +
      "</div></aside></div>"
    );
  }

  function renderTopContext() {
    const selectedShift = store.getSelectedShift();
    if (!selectedShift) return "";

    return (
      '<div class="topbar-secondary topbar-secondary-shift"><div class="topbar-breadcrumb">' +
      escapeHtml("Schedule > " + getCurrentTabLabel()) +
      "</div></div>"
    );
  }

  function renderFilterOverlay(overlay) {
    const rosters = Array.from(
      new Set(
        store.state.shifts.map(function (shift) {
          return shift.rosterName;
        })
      )
    );
    const statuses = Object.keys(data.STATUS_META);
    const clients = Array.from(
      new Set(
        store.state.shifts.flatMap(function (shift) {
          return shift.participants.map(function (participant) {
            return participant.name;
          });
        })
      )
    );

    return (
      '<section class="overlay-sheet"><div class="overlay-sheet-header"><div><h2 class="overlay-title">Shift filters</h2></div><button class="ghost-button icon-only-button" data-action="apply-filters" aria-label="Close filters">' +
      renderIcon("x") +
      '</button></div><div class="overlay-sheet-body"><div class="field"><span class="field-label">Roster</span><select class="select-input" data-action="filter-change" data-field="roster"><option value="">All rosters</option>' +
      rosters
        .map(function (roster) {
          return '<option value="' + escapeHtml(roster) + '" ' + (overlay.draft.roster === roster ? "selected" : "") + ">" + escapeHtml(roster) + "</option>";
        })
        .join("") +
      '</select></div><div class="field"><span class="field-label">Status</span><select class="select-input" data-action="filter-change" data-field="status"><option value="">All statuses</option>' +
      statuses
        .map(function (status) {
          return '<option value="' + status + '" ' + (overlay.draft.status === status ? "selected" : "") + ">" + escapeHtml(data.STATUS_META[status].label) + "</option>";
        })
        .join("") +
      '</select></div><div class="field"><span class="field-label">Client</span><select class="select-input" data-action="filter-change" data-field="client"><option value="">All clients</option>' +
      clients
        .map(function (client) {
          return '<option value="' + escapeHtml(client) + '" ' + (overlay.draft.client === client ? "selected" : "") + ">" + escapeHtml(client) + "</option>";
        })
        .join("") +
      '</select></div><div class="actions-row overlay-actions"><button class="ghost-button" data-action="clear-filters">Clear</button><button class="solid-button" data-action="apply-filters">Close</button></div></div></section>'
    );
  }

  function renderMonthCalendarOverlay(overlay) {
    const monthStart = new Date(overlay.monthCursor + "T00:00:00");
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const firstGridDate = new Date(monthStart);
    const firstDay = firstGridDate.getDay() || 7;
    firstGridDate.setDate(firstGridDate.getDate() - firstDay + 1);
    const days = Array.from({ length: 42 }, function (_, index) {
      const date = new Date(firstGridDate);
      date.setDate(firstGridDate.getDate() + index);
      return date;
    });

    return (
      '<section class="overlay-sheet"><div class="overlay-sheet-header"><div><div class="overlay-kicker">Calendar</div><h2 class="overlay-title">' +
      escapeHtml(
        new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" }).format(monthStart)
      ) +
      '</h2></div><div class="actions-row"><button class="ghost-button icon-only-button" data-action="calendar-month" data-offset="-1" aria-label="Previous month">&lt;</button><button class="ghost-button icon-only-button" data-action="calendar-month" data-offset="1" aria-label="Next month">&gt;</button><button class="ghost-button button-compact" data-action="close-overlay">Close</button></div></div>' +
      '<div class="overlay-sheet-body"><div class="month-grid-labels">' +
      ["M", "T", "W", "T", "F", "S", "S"]
        .map(function (label) {
          return '<span class="month-grid-label">' + label + "</span>";
        })
        .join("") +
      '</div><div class="month-grid">' +
      days
        .map(function (day) {
          const key = dateKey(day);
          const shiftCount = getShiftCountForDate(key);
          const isCurrentMonth = day.getMonth() === month;
          const isSelected = key === store.state.selectedDate;
          return (
            '<button class="month-day ' +
            (isSelected ? "active" : "") +
            (!isCurrentMonth ? " muted" : "") +
            '" data-action="jump-to-date" data-date="' +
            key +
            '">' +
            '<span>' +
            day.getDate() +
            '</span><span class="month-day-dots">' +
            (shiftCount === 0 ? "" : shiftCount === 1 ? "•" : "••") +
            "</span></button>"
          );
        })
        .join("") +
      "</div></div></section>"
    );
  }

  function renderClientNoteOverlay(overlay) {
    const shift = store.state.shifts.find(function (entry) {
      return entry.id === overlay.shiftId;
    });
    const participant = shift.participants.find(function (entry) {
      return entry.id === overlay.participantId;
    });
    const note = shift.notes.clientByParticipant[participant.id];
    const formAccordionKey = shift.id + ":" + participant.id;
    const isFormsOpen = Boolean(store.state.accordions.forms[formAccordionKey]);
    const filteredForms = data.FORMS_LIBRARY.filter(function (formName) {
      return formName.toLowerCase().includes((overlay.formSearch || "").toLowerCase());
    });

    return (
      '<section class="overlay-sheet"><div class="overlay-sheet-header"><div><div class="overlay-kicker">Client notes</div><h2 class="overlay-title">' +
      escapeHtml(participant.name) +
      '</h2></div><button class="ghost-button button-compact" data-action="close-overlay">Close</button></div>' +
      '<div class="overlay-sheet-body">' +
      '<div class="field"><span class="field-label">Attendance</span><select class="select-input" data-action="set-client-attendance" data-shift-id="' +
      shift.id +
      '" data-participant-id="' +
      participant.id +
      '"><option value="attended" ' +
      (note.attendance === "attended" ? "selected" : "") +
      '>Attended</option><option value="not_attended" ' +
      (note.attendance === "not_attended" ? "selected" : "") +
      ">Not attended</option></select></div>" +
      (note.attendance === "not_attended"
        ? '<div class="field"><span class="field-label">Reason required</span><textarea class="textarea compact-textarea" data-action="client-absence-input" data-shift-id="' +
          shift.id +
          '" data-participant-id="' +
          participant.id +
          '">' +
          escapeHtml(note.absenceReason || "") +
          "</textarea></div>"
        : "") +
      '<div class="actions-row"><button class="ghost-button button-compact" data-action="placeholder">Goals</button></div>' +
      '<div class="accordion-item overlay-accordion"><button class="accordion-trigger" data-action="toggle-forms-accordion" data-shift-id="' +
      shift.id +
      '" data-participant-id="' +
      participant.id +
      '"><span>Forms</span><span>' +
      (isFormsOpen ? "Hide" : "Show") +
      "</span></button>" +
      (isFormsOpen
        ? '<div class="accordion-content"><div class="field"><span class="field-label">Search forms</span><input class="text-input" data-action="form-search-input" value="' +
          escapeHtml(overlay.formSearch || "") +
          '" /></div><div class="field"><span class="field-label">Select form</span><select class="select-input" data-action="form-select-change">' +
          filteredForms
            .map(function (formName) {
              return (
                '<option value="' +
                escapeHtml(formName) +
                '" ' +
                ((overlay.formSelection || "") === formName ? "selected" : "") +
                ">" +
                escapeHtml(formName) +
                "</option>"
              );
            })
            .join("") +
          '</select></div><div class="actions-row"><button class="ghost-button button-compact" data-action="add-linked-form" data-shift-id="' +
          shift.id +
          '" data-participant-id="' +
          participant.id +
          '">Add form</button></div>' +
          (note.linkedForms.length
            ? '<div class="linked-list">' +
              note.linkedForms
                .map(function (formName) {
                  return '<div class="linked-pill">' + escapeHtml(formName) + "</div>";
                })
                .join("") +
              "</div>"
            : '<p class="subtle">No forms linked yet.</p>') +
          "</div>"
        : "") +
      "</div>" +
      '<div class="field"><span class="field-label">Client-specific notes</span><textarea class="textarea" data-action="client-note-input" data-shift-id="' +
      shift.id +
      '" data-participant-id="' +
      participant.id +
      '">' +
      escapeHtml(note.note || "") +
      '</textarea><div class="autosave-indicator" data-autosave-indicator="client-note" data-shift-id="' +
      shift.id +
      '" data-participant-id="' +
      participant.id +
      '">' +
      escapeHtml(getAutosaveText("client-note", shift.id, participant.id)) +
      "</div></div></div></section>"
    );
  }

  function renderGeneralNotesOverlay(overlay) {
    const shift = store.state.shifts.find(function (entry) {
      return entry.id === overlay.shiftId;
    });
    return (
      '<section class="overlay-sheet"><div class="overlay-sheet-header"><div><div class="overlay-kicker">Shift notes</div><h2 class="overlay-title">General shift notes</h2></div><button class="ghost-button button-compact" data-action="close-overlay">Close</button></div>' +
      '<div class="overlay-sheet-body"><div class="field"><span class="field-label">Notes</span><textarea class="textarea textarea-large" data-action="general-note-input" data-shift-id="' +
      shift.id +
      '">' +
      escapeHtml(shift.notes.general || "") +
      '</textarea><div class="autosave-indicator" data-autosave-indicator="general-notes" data-shift-id="' +
      shift.id +
      '">' +
      escapeHtml(getAutosaveText("general-notes", shift.id, null)) +
      "</div></div></div></section>"
    );
  }

  function renderAllowanceOverlay(overlay) {
    return (
      '<section class="overlay-sheet"><div class="overlay-sheet-header"><div><div class="overlay-kicker">Allowances</div><h2 class="overlay-title">' +
      (overlay.allowanceId ? "Edit allowance" : "Add allowance") +
      '</h2></div><button class="ghost-button button-compact" data-action="close-overlay">Close</button></div>' +
      '<div class="overlay-sheet-body"><div class="field"><span class="field-label">Allowance type</span><select class="select-input" data-action="allowance-type-change">' +
      data.ALLOWANCE_OPTIONS
        .map(function (option) {
          return (
            '<option value="' +
            option.id +
            '" ' +
            (overlay.draft.typeId === option.id ? "selected" : "") +
            ">" +
            escapeHtml(option.label) +
            "</option>"
          );
        })
        .join("") +
      '</select></div><div class="field"><span class="field-label">Amount / unit quantity</span><input class="text-input" value="' +
      escapeHtml(overlay.draft.quantity || "") +
      '" data-action="allowance-quantity-input" /></div><div class="subtle">Unit: ' +
      escapeHtml(overlay.draft.unitLabel) +
      '</div><div class="actions-row"><button class="solid-button" data-action="save-allowance">Save allowance</button></div></div></section>'
    );
  }

  function renderActiveOverlay() {
    const overlay = store.state.activeOverlay;
    if (!overlay) return "";
    if (overlay.type === "shift-filters") return renderFilterOverlay(overlay);
    if (overlay.type === "month-calendar") return renderMonthCalendarOverlay(overlay);
    if (overlay.type === "client-note") return renderClientNoteOverlay(overlay);
    if (overlay.type === "general-notes") return renderGeneralNotesOverlay(overlay);
    if (overlay.type === "allowance") return renderAllowanceOverlay(overlay);
    return "";
  }

  function renderCurrentPage() {
    if (store.state.selectedShiftId) {
      return renderShiftDetail(store.getSelectedShift());
    }

    switch (store.state.currentPage) {
      case "schedule":
        return renderSchedulePage();
      case "leave":
        return renderPlaceholderPage("Leave", "Simple placeholder for leave requests and balances.");
      case "availability":
        return renderPlaceholderPage("Availability", "Simple placeholder for weekly availability submission.");
      case "documents":
        return renderPlaceholderPage("Documents", "Important documents and forms would be listed here.");
      case "settings":
        return (
          '<section class="section-stack">' +
          renderPlaceholderPage("Settings", "Passcode and geolocation settings for the prototype.") +
          '<section class="section-block"><h3 class="section-title">Passcode settings</h3><p class="subtle">Placeholder controls for changing the app passcode.</p></section>' +
          '<section class="section-block"><h3 class="section-title">Geolocation settings</h3><p class="subtle">Placeholder controls for location permissions and check-in requirements.</p></section>' +
          "</section>"
        );
      default:
        return renderSchedulePage();
    }
  }

  APP.ui = {
    plusDays,
    renderTimerValue: formatDurationFrom,
    renderApp: function () {
      return (
        '<div class="app-shell">' +
        '<header class="topbar">' +
        '<div class="topbar-utility"><button class="icon-button icon-only-button" data-action="toggle-menu" aria-label="Open menu">' +
        renderIcon("menu") +
        '</button><div class="topbar-center">' +
        (store.getActiveShift()
          ? '<button class="active-timer-link" data-action="resume-active-shift"><span class="subtle">On shift</span> <strong data-live-timer="' +
            store.getActiveShift().id +
            '">' +
            escapeHtml(formatDurationFrom(store.getActiveShift().workflow.checkedInAt)) +
            "</strong></button>"
          : "") +
        '</div><button class="icon-button icon-only-button" data-action="toggle-notifications" aria-label="Open notifications">' +
        renderIcon("bell") +
        "</button></div>" +
        renderTopContext() +
        "</header>" +
        '<main class="content">' +
        renderCurrentPage() +
        "</main>" +
        renderActiveOverlay() +
        renderNotifications() +
        renderBurgerMenu() +
        "</div>"
      );
    },
  };
})();
