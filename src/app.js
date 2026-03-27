(function () {
  const APP = (window.SupportShiftApp = window.SupportShiftApp || {});
  const store = APP.store;
  const ui = APP.ui;

  const root = document.getElementById("app");
  let weekGesture = null;
  let suppressNextDayTap = false;
  let pendingWeekAnimation = "";
  let detailTabScrollLeft = 0;
  let loadingTimerId = null;
  let toastTimerId = null;

  function render() {
    const existingTabScroll = document.querySelector("[data-tab-scroll]");
    if (existingTabScroll) {
      detailTabScrollLeft = existingTabScroll.scrollLeft;
    }
    store.recomputeAllStatuses();
    root.innerHTML = ui.renderApp();
    bindWeekSwipe();
    bindDetailTabScroll();
    applyWeekAnimation();
    restoreDetailTabScroll();
    syncLoadingFlow();
    syncToast();
    updateLiveUi();
  }

  function applyWeekAnimation() {
    const slide = document.querySelector("[data-week-slide]");
    if (!slide || !pendingWeekAnimation) return;
    const animationDirection = pendingWeekAnimation;
    slide.classList.add("week-slide-enter", "week-slide-enter-" + animationDirection);
    window.setTimeout(function () {
      slide.classList.remove("week-slide-enter", "week-slide-enter-" + animationDirection);
    }, 220);
    pendingWeekAnimation = "";
  }

  function bindWeekSwipe() {
    const strip = document.querySelector("[data-week-strip]");
    if (!strip || strip.getAttribute("data-bound") === "true") return;
    strip.setAttribute("data-bound", "true");

    strip.addEventListener("touchstart", function (event) {
      const touch = event.touches[0];
      weekGesture = {
        startX: touch.clientX,
        startY: touch.clientY,
        handled: false,
      };
    });

    strip.addEventListener(
      "touchmove",
      function (event) {
        if (!weekGesture || weekGesture.handled) return;
        const touch = event.touches[0];
        const deltaX = touch.clientX - weekGesture.startX;
        const deltaY = touch.clientY - weekGesture.startY;

        if (Math.abs(deltaX) < 36 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

        const weekOffset = deltaX < 0 ? 1 : -1;
        weekGesture.handled = true;
        suppressNextDayTap = true;
        pendingWeekAnimation = deltaX < 0 ? "next" : "previous";
        store.shiftActiveWeek(weekOffset);
        event.preventDefault();
      },
      { passive: false }
    );

    strip.addEventListener("touchend", function () {
      weekGesture = null;
      window.setTimeout(function () {
        suppressNextDayTap = false;
      }, 0);
    });

    strip.addEventListener("touchcancel", function () {
      weekGesture = null;
      suppressNextDayTap = false;
    });
  }

  function bindDetailTabScroll() {
    const strip = document.querySelector("[data-tab-scroll]");
    if (!strip || strip.getAttribute("data-bound") === "true") return;
    strip.setAttribute("data-bound", "true");
    strip.addEventListener("scroll", function () {
      detailTabScrollLeft = strip.scrollLeft;
    });
  }

  function restoreDetailTabScroll() {
    const strip = document.querySelector("[data-tab-scroll]");
    if (!strip) {
      detailTabScrollLeft = 0;
      return;
    }
    strip.scrollLeft = detailTabScrollLeft;
    const selectedTab = strip.querySelector('[data-tab-button="' + store.state.selectedTab + '"]');
    if (selectedTab && typeof selectedTab.scrollIntoView === "function") {
      selectedTab.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  function syncLoadingFlow() {
    if (store.state.currentPage === "loading") {
      if (loadingTimerId) return;
      loadingTimerId = window.setTimeout(function () {
        loadingTimerId = null;
        store.completeLoginFlow();
      }, 3500);
      return;
    }

    if (loadingTimerId) {
      window.clearTimeout(loadingTimerId);
      loadingTimerId = null;
    }
  }

  function setAutosaveIndicator(type, shiftId, participantId) {
    const selector =
      '[data-autosave-indicator="' +
      type +
      '"][data-shift-id="' +
      shiftId +
      '"]' +
      (participantId ? '[data-participant-id="' + participantId + '"]' : "");
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = "Autosaved just now";
    }
  }

  function syncToast() {
    if (store.state.toast) {
      if (toastTimerId) return;
      toastTimerId = window.setTimeout(function () {
        toastTimerId = null;
        store.clearToast();
      }, 2400);
      return;
    }

    if (toastTimerId) {
      window.clearTimeout(toastTimerId);
      toastTimerId = null;
    }
  }

  function updateLiveUi() {
    const activeShift = store.getLiveTimerShift();
    document.querySelectorAll("[data-live-timer]").forEach(function (node) {
      if (!activeShift || node.getAttribute("data-live-timer") !== activeShift.id) return;
      node.textContent = ui.renderTimerValue(activeShift.workflow.checkedInAt);
    });
  }

  function handleClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    const action = target.getAttribute("data-action");

    if (action === "toggle-menu") store.toggleMenu();
    if (action === "close-menu") store.closeMenu();
    if (action === "toggle-notifications") store.toggleNotifications();
    if (action === "close-notifications") store.closeNotifications();
    if (action === "close-overlays") store.closeOverlays();
    if (action === "go-page") store.setPage(target.getAttribute("data-page"));
    if (action === "mock-login") store.startLoginFlow();
    if (action === "shift-week") {
      const offset = Number(target.getAttribute("data-week-offset") || 0);
      if (offset) {
        pendingWeekAnimation = offset > 0 ? "next" : "previous";
        store.shiftActiveWeek(offset);
      }
    }
    if (action === "select-date") {
      if (suppressNextDayTap) return;
      store.setSelectedDate(target.getAttribute("data-date"));
    }
    if (action === "open-calendar") store.openCalendarOverlay();
    if (action === "open-filters") store.openFilterOverlay();
    if (action === "apply-filters") store.applyFilterDraft();
    if (action === "clear-filters") store.clearFilters();
    if (action === "calendar-month") {
      store.shiftCalendarMonth(Number(target.getAttribute("data-offset") || 0));
    }
    if (action === "jump-to-date") store.jumpToDate(target.getAttribute("data-date"));
    if (action === "open-shift") store.openShift(target.getAttribute("data-shift-id"));
    if (action === "open-forgot-check") store.openForgotCheckOverlay();
    if (action === "resume-active-shift") store.openActiveShift();
    if (action === "back-to-schedule") store.goBackToSchedule();
    if (action === "forgot-check-back") store.promptForgotCheckClose();
    if (action === "forgot-check-cancel") store.promptForgotCheckClose();
    if (action === "forgot-check-keep-editing") store.keepForgotCheckEditing();
    if (action === "forgot-check-discard") store.discardForgotCheck();
    if (action === "forgot-check-send") store.submitForgotCheckRequest();
    if (action === "select-tab") store.setTab(target.getAttribute("data-tab"));
    if (action === "check-in") store.checkIn(target.getAttribute("data-shift-id"));
    if (action === "check-out") store.checkOut(target.getAttribute("data-shift-id"));
    if (action === "toggle-task") {
      store.toggleTask(target.getAttribute("data-shift-id"), target.getAttribute("data-task-id"));
    }
    if (action === "open-client-note") {
      store.openClientNoteOverlay(
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-participant-id")
      );
    }
    if (action === "open-general-notes") {
      store.openGeneralNotesOverlay(target.getAttribute("data-shift-id"));
    }
    if (action === "toggle-forms-accordion") {
      store.toggleFormsAccordion(
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-participant-id")
      );
    }
    if (action === "add-linked-form") {
      store.addLinkedForm(
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-participant-id")
      );
    }
    if (action === "toggle-client-info") {
      store.toggleClientInfoAccordion(
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-participant-id")
      );
    }
    if (action === "open-add-allowance") {
      store.openAllowanceOverlay(target.getAttribute("data-shift-id"));
    }
    if (action === "edit-allowance") {
      store.openAllowanceOverlay(
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-allowance-id")
      );
    }
    if (action === "save-allowance") store.saveAllowanceDraft();
    if (action === "open-add-disturbance") {
      store.openDisturbanceOverlay(target.getAttribute("data-shift-id"));
    }
    if (action === "edit-disturbance") {
      store.openDisturbanceOverlay(
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-disturbance-id")
      );
    }
    if (action === "save-disturbance") store.saveDisturbanceDraft();
    if (action === "close-overlay") store.closeActiveOverlay();
    if (action === "placeholder") window.alert("Placeholder action for prototype only.");
  }

  function handleChange(event) {
    const target = event.target;
    const action = target.getAttribute("data-action");
    if (action === "set-client-attendance") {
      store.updateClientAttendance(
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-participant-id"),
        target.value
      );
    }
    if (action === "form-select-change") {
      store.setFormSelection(target.value);
    }
    if (action === "allowance-type-change") {
      store.setAllowanceType(target.value);
    }
    if (action === "disturbance-client-change") {
      const selectedValues = Array.from(target.selectedOptions).map(function (option) {
        return option.value;
      });
      Array.from(target.options).forEach(function (option) {
        store.toggleDisturbanceClient(option.value, selectedValues.includes(option.value));
      });
    }
    if (action === "filter-change") {
      store.updateFilterDraft(target.getAttribute("data-field"), target.value);
    }
    if (action === "forgot-check-select") {
      store.updateForgotCheckDraft(target.getAttribute("data-field"), target.value);
    }
  }

  function handleInput(event) {
    const target = event.target;
    const action = target.getAttribute("data-action");

    if (action === "client-note-input") {
      store.updateClientNoteText(
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-participant-id"),
        target.value
      );
      setAutosaveIndicator(
        "client-note",
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-participant-id")
      );
    }

    if (action === "client-absence-input") {
      store.updateClientAbsenceReason(
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-participant-id"),
        target.value
      );
      setAutosaveIndicator(
        "client-note",
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-participant-id")
      );
    }

    if (action === "general-note-input") {
      store.updateGeneralNoteText(target.getAttribute("data-shift-id"), target.value);
      setAutosaveIndicator("general-notes", target.getAttribute("data-shift-id"));
    }

    if (action === "form-search-input") {
      store.setFormSearch(target.value);
    }

    if (action === "login-input") {
      store.setLoginInput(target.value);
    }

    if (action === "allowance-quantity-input") {
      store.updateAllowanceDraft("quantity", target.value);
    }
    if (action === "disturbance-draft-input") {
      store.updateDisturbanceDraft(target.getAttribute("data-field"), target.value);
    }
    if (action === "forgot-check-input") {
      store.updateForgotCheckDraft(target.getAttribute("data-field"), target.value);
    }
  }

  store.subscribe(render);
  document.addEventListener("click", handleClick);
  document.addEventListener("change", handleChange);
  document.addEventListener("input", handleInput);
  window.setInterval(updateLiveUi, 1000);

  render();
})();
