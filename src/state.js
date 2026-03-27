(function () {
  const APP = (window.SupportShiftApp = window.SupportShiftApp || {});
  const data = APP.data;
  const AMENDMENT_STORAGE_KEY = "support-shift-amendment-requests";

  function toDate(dateKey, time) {
    return new Date(dateKey + "T" + time + ":00");
  }

  function diffMinutes(start, end) {
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  }

  function noteKey(shiftId, participantId) {
    return shiftId + ":" + participantId;
  }

  function recomputeShiftStatus(shift, now) {
    if (shift.workflow.manualStatus && shift.workflow.manualStatus !== "completed_recent") {
      shift.status = shift.workflow.manualStatus;
      return shift.status;
    }

    const shiftStart = toDate(shift.date, shift.startTime);
    const shiftEnd = toDate(shift.date, shift.endTime);
    if (shiftEnd < shiftStart) {
      shiftEnd.setDate(shiftEnd.getDate() + 1);
    }

    const checkedIn = shift.workflow.checkedInAt ? new Date(shift.workflow.checkedInAt) : null;
    const checkedOut = shift.workflow.checkedOutAt ? new Date(shift.workflow.checkedOutAt) : null;

    if (checkedOut) {
      shift.workflow.actualWorkedMinutes =
        diffMinutes(checkedIn || shiftStart, checkedOut) - (shift.breakDuration || 0);
      shift.status =
        now.getTime() - checkedOut.getTime() < 24 * 60 * 60 * 1000
          ? "completed_recent"
          : "completed";
      return shift.status;
    }

    if (checkedIn) {
      const missingCheckOutAt = new Date(shiftEnd.getTime() + 10 * 60 * 1000);
      shift.status = now > missingCheckOutAt ? "missing_check_out" : "in_progress";
      return shift.status;
    }

    if (now > shiftEnd) {
      shift.status = "missing_check_in";
      return shift.status;
    }

    shift.status = "not_started";
    return shift.status;
  }

  function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return [year, month, day].join("-");
  }

  function getMonday(date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    const day = next.getDay() || 7;
    next.setDate(next.getDate() - day + 1);
    return next;
  }

  function initializeShiftExtensions(shift) {
    const existingClientNote = shift.notes.client || "";
    const previousAttendance = shift.notes.attendance || {};

    shift.notes.general = shift.notes.general || "";
    shift.notes.clientByParticipant = shift.participants.reduce(function (acc, participant, index) {
      acc[participant.id] = {
        attendance: previousAttendance[participant.id] === false ? "not_attended" : "attended",
        absenceReason: "",
        note: index === 0 ? existingClientNote : "",
        linkedForms: [],
      };
      return acc;
    }, {});
    shift.notes.client = "";
    shift.amendmentRequests = Array.isArray(shift.amendmentRequests) ? shift.amendmentRequests : [];
  }

  function loadStoredAmendmentRequests() {
    try {
      const raw = window.localStorage.getItem(AMENDMENT_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function saveStoredAmendmentRequests() {
    try {
      const payload = state.shifts.reduce(function (acc, shift) {
        if (shift.amendmentRequests && shift.amendmentRequests.length) {
          acc[shift.id] = shift.amendmentRequests;
        }
        return acc;
      }, {});
      window.localStorage.setItem(AMENDMENT_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      return;
    }
  }

  function hydrateAmendmentRequests() {
    const storedRequests = loadStoredAmendmentRequests();
    state.shifts.forEach(function (shift) {
      if (Array.isArray(storedRequests[shift.id])) {
        shift.amendmentRequests = storedRequests[shift.id];
      }
    });
  }

  const state = {
    currentPage: "login",
    selectedShiftId: null,
    selectedTab: "shift",
    loginInput: "",
    liveTimerShiftId: null,
    activeWeekStartDate: null,
    selectedDate: null,
    isMenuOpen: false,
    isNotificationsOpen: false,
    activeOverlay: null,
    activeDialog: null,
    toast: null,
    filters: {
      applied: {
        roster: "",
        status: "",
        client: "",
      },
    },
    autosave: {
      type: null,
      shiftId: null,
      participantId: null,
      savedAt: null,
    },
    accordions: {
      clientInfo: {},
      forms: {},
    },
    shifts: JSON.parse(JSON.stringify(data.mockShifts)),
    notifications: [
      { id: "n1", text: "Timesheet reminder: 1 shift needs check-out review." },
      { id: "n2", text: "A new sleepover procedure document has been added." },
      { id: "n3", text: "Availability submission closes Friday at 5:00 PM." },
    ],
  };

  function subscribe(listener) {
    state.listener = listener;
  }

  function notify() {
    if (typeof state.listener === "function") {
      state.listener();
    }
  }

  function initialize() {
    const today = new Date();
    state.activeWeekStartDate = formatDateKey(getMonday(today));
    state.selectedDate = formatDateKey(today);
    state.shifts.forEach(function (shift) {
      initializeShiftExtensions(shift);
      recomputeShiftStatus(shift, today);
    });
    hydrateAmendmentRequests();
  }

  function getSelectedShift() {
    return state.shifts.find(function (shift) {
      return shift.id === state.selectedShiftId;
    });
  }

  function getActiveShift() {
    return (
      state.shifts
        .filter(function (shift) {
          return Boolean(shift.workflow.checkedInAt) && !shift.workflow.checkedOutAt;
        })
        .sort(function (a, b) {
          return new Date(b.workflow.checkedInAt).getTime() - new Date(a.workflow.checkedInAt).getTime();
        })[0] || null
    );
  }

  function getLiveTimerShift() {
    if (!state.liveTimerShiftId) return null;
    const shift = getShiftById(state.liveTimerShiftId);
    if (!shift || !shift.workflow.checkedInAt || shift.workflow.checkedOutAt) return null;
    return shift;
  }

  function getShiftById(shiftId) {
    return state.shifts.find(function (shift) {
      return shift.id === shiftId;
    });
  }

  function updateShift(shiftId, updater, shouldNotify) {
    const shift = getShiftById(shiftId);
    if (!shift) return;
    updater(shift);
    recomputeShiftStatus(shift, new Date());
    if (shouldNotify !== false) notify();
  }

  function setAutosave(type, shiftId, participantId) {
    state.autosave = {
      type,
      shiftId,
      participantId: participantId || null,
      savedAt: Date.now(),
    };
  }

  function setPage(page) {
    state.currentPage = page;
    state.selectedShiftId = null;
    state.selectedTab = "shift";
    state.isMenuOpen = false;
    state.activeOverlay = null;
    notify();
  }

  function toggleMenu() {
    state.isMenuOpen = !state.isMenuOpen;
    if (state.isMenuOpen) state.isNotificationsOpen = false;
    notify();
  }

  function closeMenu() {
    state.isMenuOpen = false;
    notify();
  }

  function toggleNotifications() {
    state.isNotificationsOpen = !state.isNotificationsOpen;
    if (state.isNotificationsOpen) state.isMenuOpen = false;
    notify();
  }

  function closeNotifications() {
    state.isNotificationsOpen = false;
    notify();
  }

  function closeOverlays() {
    state.isMenuOpen = false;
    state.isNotificationsOpen = false;
    notify();
  }

  function setActiveWeekStartDate(dateKey) {
    const monday = getMonday(new Date(dateKey + "T00:00:00"));
    const mondayKey = formatDateKey(monday);
    state.activeWeekStartDate = mondayKey;
    state.selectedDate = mondayKey;
    notify();
  }

  function shiftActiveWeek(weekOffset) {
    const currentMonday = getMonday(new Date(state.activeWeekStartDate + "T00:00:00"));
    currentMonday.setDate(currentMonday.getDate() + weekOffset * 7);
    const mondayKey = formatDateKey(currentMonday);
    state.activeWeekStartDate = mondayKey;
    state.selectedDate = mondayKey;
    notify();
  }

  function setSelectedDate(dateKey) {
    state.selectedDate = dateKey;
    notify();
  }

  function setLoginInput(value) {
    state.loginInput = value;
    notify();
  }

  function startLoginFlow() {
    state.currentPage = "loading";
    state.selectedShiftId = null;
    state.selectedTab = "shift";
    state.activeOverlay = null;
    notify();
  }

  function completeLoginFlow() {
    state.currentPage = "schedule";
    notify();
  }

  function openCalendarOverlay() {
    const selectedDate = new Date(state.selectedDate + "T00:00:00");
    state.activeOverlay = {
      type: "month-calendar",
      monthCursor: formatDateKey(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)),
    };
    notify();
  }

  function openFilterOverlay() {
    state.activeOverlay = {
      type: "shift-filters",
      draft: Object.assign({}, state.filters.applied),
    };
    notify();
  }

  function getForgotCheckDraft() {
    if (!state.activeOverlay || state.activeOverlay.type !== "forgot-check") return null;
    return state.activeOverlay.draft;
  }

  function hasForgotCheckInput() {
    const draft = getForgotCheckDraft();
    if (!draft) return false;
    return Boolean(draft.date || draft.shiftId || draft.checkInTime || draft.checkOutTime || draft.reason.trim());
  }

  function canSubmitForgotCheck() {
    const draft = getForgotCheckDraft();
    if (!draft) return false;
    return Boolean(draft.date && draft.shiftId && draft.reason.trim());
  }

  function updateFilterDraft(field, value) {
    if (!state.activeOverlay || state.activeOverlay.type !== "shift-filters") return;
    state.activeOverlay.draft[field] = value;
    notify();
  }

  function applyFilterDraft() {
    if (!state.activeOverlay || state.activeOverlay.type !== "shift-filters") return;
    state.filters.applied = Object.assign({}, state.activeOverlay.draft);
    state.activeOverlay = null;
    notify();
  }

  function clearFilters() {
    const cleared = { roster: "", status: "", client: "" };
    state.filters.applied = cleared;
    if (state.activeOverlay && state.activeOverlay.type === "shift-filters") {
      state.activeOverlay.draft = Object.assign({}, cleared);
      notify();
      return;
    }
    notify();
  }

  function shiftCalendarMonth(offset) {
    if (!state.activeOverlay || state.activeOverlay.type !== "month-calendar") return;
    const current = new Date(state.activeOverlay.monthCursor + "T00:00:00");
    const next = new Date(current.getFullYear(), current.getMonth() + offset, 1);
    state.activeOverlay.monthCursor = formatDateKey(next);
    notify();
  }

  function jumpToDate(dateKey) {
    const selected = new Date(dateKey + "T00:00:00");
    const monday = getMonday(selected);
    state.activeWeekStartDate = formatDateKey(monday);
    state.selectedDate = dateKey;
    state.activeOverlay = null;
    notify();
  }

  function openShift(shiftId) {
    state.currentPage = "schedule";
    state.selectedShiftId = shiftId;
    state.selectedTab = "shift";
    state.isMenuOpen = false;
    state.activeOverlay = null;
    notify();
  }

  function openForgotCheckOverlay() {
    state.isMenuOpen = false;
    state.activeDialog = null;
    state.activeOverlay = {
      type: "forgot-check",
      draft: {
        date: "",
        shiftId: "",
        checkInTime: "",
        checkOutTime: "",
        reason: "",
      },
    };
    notify();
  }

  function openActiveShift() {
    const activeShift = getLiveTimerShift() || getActiveShift();
    if (!activeShift) return;
    state.currentPage = "schedule";
    state.selectedShiftId = activeShift.id;
    state.isMenuOpen = false;
    state.activeOverlay = null;
    notify();
  }

  function goBackToSchedule() {
    state.selectedShiftId = null;
    state.selectedTab = "shift";
    state.activeOverlay = null;
    notify();
  }

  function setTab(tab) {
    state.selectedTab = tab;
    state.activeOverlay = null;
    notify();
  }

  function checkIn(shiftId) {
    updateShift(shiftId, function (shift) {
      shift.workflow.checkedInAt = new Date().toISOString();
      shift.workflow.checkedOutAt = null;
      shift.workflow.manualStatus = null;
      state.liveTimerShiftId = shiftId;
    });
  }

  function checkOut(shiftId) {
    updateShift(shiftId, function (shift) {
      shift.workflow.checkedOutAt = new Date().toISOString();
      shift.workflow.actualWorkedMinutes = diffMinutes(
        new Date(shift.workflow.checkedInAt || toDate(shift.date, shift.startTime)),
        new Date(shift.workflow.checkedOutAt)
      ) - (shift.breakDuration || 0);
      shift.workflow.manualStatus = null;
      if (state.liveTimerShiftId === shiftId) state.liveTimerShiftId = null;
      state.activeOverlay = null;
    });
  }

  function toggleTask(shiftId, taskId) {
    updateShift(shiftId, function (shift) {
      const task = shift.tasks.find(function (entry) {
        return entry.id === taskId;
      });
      if (task) task.done = !task.done;
    });
  }

  function openClientNoteOverlay(shiftId, participantId) {
    const record = getShiftById(shiftId).notes.clientByParticipant[participantId];
    state.activeOverlay = {
      type: "client-note",
      shiftId,
      participantId,
      formSearch: "",
      formSelection: data.FORMS_LIBRARY[0] || "",
    };
    if (!record.linkedForms) record.linkedForms = [];
    notify();
  }

  function openGeneralNotesOverlay(shiftId) {
    state.activeOverlay = {
      type: "general-notes",
      shiftId,
    };
    notify();
  }

  function openAllowanceOverlay(shiftId, allowanceId) {
    const shift = getShiftById(shiftId);
    const existing = shift.allowances.find(function (entry) {
      return entry.id === allowanceId;
    });
    const firstOption = data.ALLOWANCE_OPTIONS[0];
    state.activeOverlay = {
      type: "allowance",
      shiftId,
      allowanceId: allowanceId || null,
      draft: existing
        ? {
            typeId: existing.typeId || firstOption.id,
            label: existing.type,
            quantity: String(existing.quantity || existing.amount || ""),
            unitLabel: existing.unitLabel || firstOption.unitLabel,
          }
        : {
            typeId: firstOption.id,
            label: firstOption.label,
            quantity: "",
            unitLabel: firstOption.unitLabel,
          },
    };
    notify();
  }

  function openDisturbanceOverlay(shiftId, disturbanceId) {
    const shift = getShiftById(shiftId);
    if (!shift || shift.shiftType !== "sleepover") return;
    const existing = (shift.sleepover.disturbances || []).find(function (entry) {
      return entry.id === disturbanceId;
    });
    state.activeOverlay = {
      type: "sleep-disturbance",
      shiftId,
      disturbanceId: disturbanceId || null,
      draft: existing
        ? {
            startDate: existing.startDate || shift.date,
            startTime: existing.startTime || "",
            durationMinutes: existing.durationMinutes != null ? String(existing.durationMinutes) : "",
            endTime: existing.endTime || "",
            clientIds: existing.clientIds ? existing.clientIds.slice() : [],
          }
        : {
            startDate: shift.date,
            startTime: "",
            durationMinutes: "",
            endTime: "",
            clientIds: [],
          },
    };
    notify();
  }

  function closeActiveOverlay() {
    state.activeOverlay = null;
    notify();
  }

  function promptForgotCheckClose() {
    if (!getForgotCheckDraft()) return;
    if (!hasForgotCheckInput()) {
      state.activeOverlay = null;
      state.activeDialog = null;
      notify();
      return;
    }
    state.activeDialog = {
      type: "confirm-forgot-check-discard",
    };
    notify();
  }

  function keepForgotCheckEditing() {
    if (!state.activeDialog || state.activeDialog.type !== "confirm-forgot-check-discard") return;
    state.activeDialog = null;
    notify();
  }

  function discardForgotCheck() {
    if (!state.activeOverlay || state.activeOverlay.type !== "forgot-check") return;
    state.activeOverlay = null;
    state.activeDialog = null;
    notify();
  }

  function updateForgotCheckDraft(field, value) {
    const draft = getForgotCheckDraft();
    if (!draft) return;
    draft[field] = value;
    if (field === "date") {
      const selectedShift = draft.shiftId ? getShiftById(draft.shiftId) : null;
      if (!value || !selectedShift || selectedShift.date !== value) {
        draft.shiftId = "";
      }
    }
    notify();
  }

  function submitForgotCheckRequest() {
    if (!canSubmitForgotCheck()) return;
    const draft = getForgotCheckDraft();
    const shift = getShiftById(draft.shiftId);
    if (!shift) return;

    state.notifications.unshift({
      id: "n-forgot-check-" + Date.now(),
      text:
        "Adjustment request queued for " +
        shift.rosterName +
        " on " +
        draft.date +
        ". Manager notification simulated.",
    });
    shift.amendmentRequests.unshift({
      id: "amend-" + Date.now(),
      date: draft.date,
      shiftId: draft.shiftId,
      checkInTime: draft.checkInTime || "",
      checkOutTime: draft.checkOutTime || "",
      reason: draft.reason.trim(),
      sentAt: new Date().toISOString(),
    });
    saveStoredAmendmentRequests();
    state.activeOverlay = null;
    state.activeDialog = null;
    state.toast = {
      id: "toast-" + Date.now(),
      title: "Request sent",
      message: "Your manager will be notified of this change",
    };
    notify();
  }

  function clearToast() {
    if (!state.toast) return;
    state.toast = null;
    notify();
  }

  function updateClientAttendance(shiftId, participantId, attendance) {
    updateShift(shiftId, function (shift) {
      shift.notes.clientByParticipant[participantId].attendance = attendance;
      if (attendance === "attended") {
        shift.notes.clientByParticipant[participantId].absenceReason = "";
      }
    });
  }

  function updateClientAbsenceReason(shiftId, participantId, value) {
    updateShift(
      shiftId,
      function (shift) {
        shift.notes.clientByParticipant[participantId].absenceReason = value;
        setAutosave("client-note", shiftId, participantId);
      },
      false
    );
  }

  function updateClientNoteText(shiftId, participantId, value) {
    updateShift(
      shiftId,
      function (shift) {
        shift.notes.clientByParticipant[participantId].note = value;
        setAutosave("client-note", shiftId, participantId);
      },
      false
    );
  }

  function updateGeneralNoteText(shiftId, value) {
    updateShift(
      shiftId,
      function (shift) {
        shift.notes.general = value;
        setAutosave("general-notes", shiftId, null);
      },
      false
    );
  }

  function toggleFormsAccordion(shiftId, participantId) {
    const key = noteKey(shiftId, participantId);
    state.accordions.forms[key] = !state.accordions.forms[key];
    notify();
  }

  function setFormSearch(value) {
    if (!state.activeOverlay || state.activeOverlay.type !== "client-note") return;
    state.activeOverlay.formSearch = value;
    notify();
  }

  function setFormSelection(value) {
    if (!state.activeOverlay || state.activeOverlay.type !== "client-note") return;
    state.activeOverlay.formSelection = value;
    notify();
  }

  function addLinkedForm(shiftId, participantId) {
    if (!state.activeOverlay || !state.activeOverlay.formSelection) return;
    updateShift(shiftId, function (shift) {
      const record = shift.notes.clientByParticipant[participantId];
      if (!record.linkedForms.includes(state.activeOverlay.formSelection)) {
        record.linkedForms.push(state.activeOverlay.formSelection);
      }
      setAutosave("client-note", shiftId, participantId);
    });
  }

  function toggleClientInfoAccordion(shiftId, participantId) {
    const key = noteKey(shiftId, participantId);
    state.accordions.clientInfo[key] = !state.accordions.clientInfo[key];
    notify();
  }

  function updateAllowanceDraft(field, value) {
    if (!state.activeOverlay || state.activeOverlay.type !== "allowance") return;
    state.activeOverlay.draft[field] = value;
  }

  function updateDisturbanceDraft(field, value) {
    if (!state.activeOverlay || state.activeOverlay.type !== "sleep-disturbance") return;
    state.activeOverlay.draft[field] = value;
  }

  function toggleDisturbanceClient(clientId, isSelected) {
    if (!state.activeOverlay || state.activeOverlay.type !== "sleep-disturbance") return;
    const clientIds = state.activeOverlay.draft.clientIds || [];
    if (isSelected) {
      if (!clientIds.includes(clientId)) clientIds.push(clientId);
    } else {
      state.activeOverlay.draft.clientIds = clientIds.filter(function (entry) {
        return entry !== clientId;
      });
    }
    notify();
  }

  function setAllowanceType(typeId) {
    if (!state.activeOverlay || state.activeOverlay.type !== "allowance") return;
    const option = data.ALLOWANCE_OPTIONS.find(function (entry) {
      return entry.id === typeId;
    });
    if (!option) return;
    state.activeOverlay.draft.typeId = option.id;
    state.activeOverlay.draft.label = option.label;
    state.activeOverlay.draft.unitLabel = option.unitLabel;
    notify();
  }

  function saveAllowanceDraft() {
    if (!state.activeOverlay || state.activeOverlay.type !== "allowance") return;
    const overlay = state.activeOverlay;
    const draft = overlay.draft;
    updateShift(
      overlay.shiftId,
      function (shift) {
        const record = {
          id: overlay.allowanceId || "allow-" + Date.now(),
          typeId: draft.typeId,
          type: draft.label,
          quantity: draft.quantity,
          amount: draft.quantity,
          unitLabel: draft.unitLabel,
          notes: draft.quantity ? draft.quantity + " " + draft.unitLabel : "No quantity entered",
        };
        const index = shift.allowances.findIndex(function (entry) {
          return entry.id === overlay.allowanceId;
        });
        if (index >= 0) {
          shift.allowances[index] = record;
        } else {
          shift.allowances.push(record);
        }
      },
      false
    );
    state.activeOverlay = null;
    notify();
  }

  function saveDisturbanceDraft() {
    if (!state.activeOverlay || state.activeOverlay.type !== "sleep-disturbance") return;
    const overlay = state.activeOverlay;
    const draft = overlay.draft;
    updateShift(
      overlay.shiftId,
      function (shift) {
        if (!shift.sleepover) return;
        const record = {
          id: overlay.disturbanceId || "dist-" + Date.now(),
          startDate: draft.startDate || shift.date,
          startTime: draft.startTime || "",
          durationMinutes: draft.durationMinutes === "" ? "" : Number(draft.durationMinutes),
          endTime: draft.endTime || "",
          clientIds: (draft.clientIds || []).slice(),
        };
        const index = shift.sleepover.disturbances.findIndex(function (entry) {
          return entry.id === overlay.disturbanceId;
        });
        if (index >= 0) {
          shift.sleepover.disturbances[index] = record;
        } else {
          shift.sleepover.disturbances.push(record);
        }
      },
      false
    );
    state.activeOverlay = null;
    notify();
  }

  initialize();

  APP.store = {
    state,
    subscribe,
    setPage,
    toggleMenu,
    closeMenu,
    toggleNotifications,
    closeNotifications,
    closeOverlays,
    setActiveWeekStartDate,
    shiftActiveWeek,
    setSelectedDate,
    setLoginInput,
    startLoginFlow,
    completeLoginFlow,
    openCalendarOverlay,
    openFilterOverlay,
    updateFilterDraft,
    applyFilterDraft,
    clearFilters,
    shiftCalendarMonth,
    jumpToDate,
    openShift,
    openForgotCheckOverlay,
    openActiveShift,
    goBackToSchedule,
    setTab,
    getSelectedShift,
    getActiveShift,
    getLiveTimerShift,
    checkIn,
    checkOut,
    toggleTask,
    openClientNoteOverlay,
    openGeneralNotesOverlay,
    openAllowanceOverlay,
    openDisturbanceOverlay,
    closeActiveOverlay,
    promptForgotCheckClose,
    keepForgotCheckEditing,
    discardForgotCheck,
    updateForgotCheckDraft,
    canSubmitForgotCheck,
    submitForgotCheckRequest,
    clearToast,
    updateClientAttendance,
    updateClientAbsenceReason,
    updateClientNoteText,
    updateGeneralNoteText,
    toggleFormsAccordion,
    setFormSearch,
    setFormSelection,
    addLinkedForm,
    toggleClientInfoAccordion,
    updateAllowanceDraft,
    updateDisturbanceDraft,
    toggleDisturbanceClient,
    setAllowanceType,
    saveAllowanceDraft,
    saveDisturbanceDraft,
    recomputeAllStatuses: function () {
      const now = new Date();
      state.shifts.forEach(function (shift) {
        recomputeShiftStatus(shift, now);
      });
    },
  };
})();
