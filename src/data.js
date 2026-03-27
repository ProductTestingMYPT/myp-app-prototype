(function () {
  const APP = (window.SupportShiftApp = window.SupportShiftApp || {});

  const TODAY = new Date();

  const STATUS_META = {
    not_started: { label: "Not started", kind: "active" },
    in_progress: { label: "In progress", kind: "active" },
    missing_check_in: { label: "Missing check-in", kind: "active" },
    missing_check_out: { label: "Missing check-out", kind: "active" },
    completed_recent: { label: "Completed <24h", kind: "completed" },
    completed: { label: "Completed", kind: "completed" },
    approved: { label: "Approved", kind: "completed" },
    rejected: { label: "Rejected", kind: "completed" },
  };

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function addDays(baseDate, days) {
    const next = new Date(baseDate);
    next.setHours(0, 0, 0, 0);
    next.setDate(next.getDate() + days);
    return next;
  }

  function getMonday(date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    const day = next.getDay() || 7;
    next.setDate(next.getDate() - day + 1);
    return next;
  }

  function formatDateKey(date) {
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
    ].join("-");
  }

  function isoDateTime(dateKey, time) {
    return dateKey + "T" + time + ":00";
  }

  function nextDateKey(dateKey) {
    const date = new Date(dateKey + "T00:00:00");
    date.setDate(date.getDate() + 1);
    return formatDateKey(date);
  }

  function participant(id, name, flags, program, isNdis, contacts, representative, emergencyContacts) {
    return {
      id,
      name,
      flags,
      program,
      isNdis,
      contacts,
      representative,
      emergencyContacts,
    };
  }

  const participantDirectory = {
    p1: participant(
      "p1",
      "Mia Robertson",
      ["warning: seizures", "high needs"],
      "Supported independent living",
      true,
      ["Grace Robertson (mother) 0411 555 104", "Dr Anita Wang 07 3221 0990"],
      "Grace Robertson",
      ["Grace Robertson 0411 555 104", "On-call coordinator 07 3555 2001"]
    ),
    p2: participant(
      "p2",
      "Noah Singh",
      ["allergy: peanuts"],
      "Community access",
      true,
      ["Rakesh Singh (father) 0423 120 610"],
      "Rakesh Singh",
      ["Rakesh Singh 0423 120 610", "Program coordinator 07 3555 2002"]
    ),
    p3: participant(
      "p3",
      "Ella Hart",
      ["behaviour support plan"],
      "Respite",
      true,
      ["Kelly Hart (carer) 0433 882 311"],
      "Kelly Hart",
      ["Kelly Hart 0433 882 311", "Respite lead 07 3555 2003"]
    ),
    p4: participant(
      "p4",
      "Unit 5 residents",
      ["group home"],
      "Supported accommodation",
      false,
      ["House supervisor 07 3100 2221"],
      "House supervisor",
      ["House supervisor 07 3100 2221", "After-hours line 07 3555 2010"]
    ),
    p5: participant(
      "p5",
      "Luca Bennett",
      ["vision impaired"],
      "Community access",
      true,
      ["Helen Bennett (sister) 0402 775 668"],
      "Helen Bennett",
      ["Helen Bennett 0402 775 668", "Community coordinator 07 3555 2004"]
    ),
  };

  function buildShift(seed) {
    const dateKey = seed.date || formatDateKey(addDays(TODAY, seed.dayOffset));
    const participants = seed.participantIds.map(function (id) {
      return participantDirectory[id];
    });

    const shift = {
      id: seed.id,
      date: dateKey,
      startTime: seed.startTime,
      endTime: seed.endTime,
      breakDuration: seed.breakDuration || 0,
      rosterName: seed.rosterName,
      location: seed.location,
      description: seed.description,
      participants,
      shiftType: seed.shiftType || "standard",
      tags: seed.tags || [],
      assets: seed.assets || [],
      tasks: seed.tasks || [],
      notes: {
        client: seed.clientNotes || "",
        general: seed.generalNotes || "",
        attendance: participants.reduce(function (acc, current) {
          if (current.isNdis) acc[current.id] = false;
          return acc;
        }, {}),
      },
      documents: seed.documents || [],
      allowances: seed.allowances || [],
      transportLogs: seed.transportLogs || [],
      amendmentRequests: seed.amendmentRequests || [],
      sleepover:
        seed.shiftType === "sleepover"
          ? {
              room: "Staff room B",
              handover: "Confirm medication lockbox and overnight call protocol.",
              paidSupportMinutes: seed.paidSupportMinutes || 360,
              eveningSupport: seed.eveningSupport || "6:00pm - 10:00pm",
              morningSupport: seed.morningSupport || "6:00am - 8:00am",
              disturbances: seed.disturbances || [],
            }
          : null,
      workflow: {
        checkedInAt: seed.checkedInAt || null,
        checkedOutAt: seed.checkedOutAt || null,
        actualWorkedMinutes: seed.actualWorkedMinutes || null,
        manualStatus: seed.manualStatus || null,
      },
      status: seed.initialStatus || "not_started",
    };

    return shift;
  }

  const mockShifts = [
    buildShift({
      id: "shift-1001",
      dayOffset: 0,
      startTime: "07:00",
      endTime: "15:00",
      breakDuration: 30,
      rosterName: "Morning personal care",
      location: "Unit 5, New Farm",
      description:
        "Morning support including medication prompt, personal care, and breakfast routine.",
      participantIds: ["p1", "p4"],
      tags: ["personal care", "medication", "cleaning"],
      assets: ["Medication chart", "House keys"],
      tasks: [
        { id: "task-1", title: "Complete morning medication prompt", done: true },
        { id: "task-2", title: "Assist with shower routine for Mia", done: false },
        { id: "task-3", title: "Update communication book", done: false },
      ],
      documents: ["Medication administration record", "Behaviour support summary"],
      checkedInAt: null,
      checkedOutAt: null,
      initialStatus: "not_started",
    }),
    buildShift({
      id: "shift-1002",
      dayOffset: 0,
      startTime: "16:00",
      endTime: "22:00",
      rosterName: "Community access afternoon",
      location: "Westfield Chermside",
      description:
        "Support community participation, dinner outing, and transport home.",
      participantIds: ["p2", "p5"],
      tags: ["community access", "transport"],
      assets: ["Van access card"],
      tasks: [
        { id: "task-4", title: "Confirm return transport timing", done: true },
        { id: "task-5", title: "Support dinner budget tracking", done: false },
      ],
      documents: ["Community access plan"],
      checkedInAt: new Date().toISOString(),
      initialStatus: "in_progress",
      transportLogs: [
        { id: "trip-1", mode: "manual", from: "Hub", to: "Chermside", km: 14, notes: "Outbound" },
      ],
    }),
    buildShift({
      id: "shift-1003",
      dayOffset: 1,
      startTime: "18:00",
      endTime: "08:00",
      rosterName: "Sleepover SIL",
      location: "Unit 12, Indooroopilly",
      description:
        "Overnight sleepover with morning handover and medication observation.",
      participantIds: ["p1", "p3"],
      shiftType: "sleepover",
      tags: ["sleepover", "medication", "handover"],
      assets: ["Sleepover checklist", "Incident folder"],
      tasks: [
        { id: "task-6", title: "Complete overnight environment check", done: false },
        { id: "task-7", title: "Prepare morning handover note", done: false },
      ],
      disturbances: [],
      documents: ["Sleepover procedure", "Emergency evacuation plan"],
      initialStatus: "not_started",
    }),
    buildShift({
      id: "shift-1004",
      dayOffset: 2,
      startTime: "09:00",
      endTime: "13:00",
      rosterName: "Clinic escort",
      location: "RBWH Outpatients",
      description: "Escort to allied health appointment and complete return handover.",
      participantIds: ["p5"],
      tags: ["community access", "appointment"],
      tasks: [
        { id: "task-8", title: "Carry referral paperwork", done: false },
        { id: "task-9", title: "Record appointment outcomes", done: false },
      ],
      documents: ["Appointment referral", "Transport authorisation"],
      initialStatus: "not_started",
    }),
    buildShift({
      id: "shift-1005",
      dayOffset: -1,
      startTime: "06:30",
      endTime: "14:30",
      breakDuration: 30,
      rosterName: "House support",
      location: "Kedron house",
      description: "Domestic support, meal prep, and morning routines across the house.",
      participantIds: ["p4"],
      tags: ["cleaning", "meal prep"],
      tasks: [
        { id: "task-10", title: "Fridge temperature check", done: true },
        { id: "task-11", title: "Laundry cycle for Unit 5", done: true },
      ],
      checkedInAt: null,
      checkedOutAt: null,
      initialStatus: "missing_check_in",
    }),
    buildShift({
      id: "shift-1006",
      dayOffset: -2,
      startTime: "14:00",
      endTime: "22:00",
      rosterName: "Evening respite",
      location: "Albany Creek respite house",
      description: "Support dinner, social activities, and evening medications.",
      participantIds: ["p3"],
      tags: ["respite", "medication"],
      tasks: [
        { id: "task-12", title: "Evening medication prompt", done: true },
        { id: "task-13", title: "End-of-shift kitchen reset", done: true },
      ],
      clientNotes: "Ella engaged well after sensory break.",
      generalNotes: "Family requested update at pickup.",
      checkedInAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
      checkedOutAt: null,
      initialStatus: "missing_check_out",
    }),
    buildShift({
      id: "shift-1007",
      dayOffset: -1,
      startTime: "16:30",
      endTime: "20:30",
      rosterName: "Skill building session",
      location: "Stafford community hub",
      description:
        "Goal-based support focusing on budgeting, shopping, and independent travel skills.",
      participantIds: ["p2"],
      tags: ["community access", "capacity building"],
      tasks: [
        { id: "task-14", title: "Review weekly budgeting worksheet", done: true },
        { id: "task-15", title: "Practice bus route planning", done: true },
      ],
      clientNotes: "Noah independently used the checkout with verbal prompts only.",
      generalNotes: "Receipts filed in participant folder.",
      checkedInAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      checkedOutAt: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
      actualWorkedMinutes: 240,
      initialStatus: "completed_recent",
      allowances: [{ id: "allow-1", type: "Meal", amount: 18.5, notes: "Worker meal with participant" }],
      transportLogs: [{ id: "trip-2", mode: "manual", from: "Hub", to: "Stafford", km: 9, notes: "Round trip recorded" }],
    }),
    buildShift({
      id: "shift-1008",
      dayOffset: -5,
      startTime: "07:00",
      endTime: "15:00",
      rosterName: "Morning SIL",
      location: "Woolloongabba unit",
      description: "Daily living support with breakfast prep and community plan review.",
      participantIds: ["p1"],
      tags: ["personal care", "planning"],
      tasks: [
        { id: "task-16", title: "Review weekly planner", done: true },
      ],
      checkedInAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
      checkedOutAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
      actualWorkedMinutes: 450,
      initialStatus: "completed",
    }),
    buildShift({
      id: "shift-1009",
      dayOffset: -8,
      startTime: "13:00",
      endTime: "19:00",
      rosterName: "Approved social support",
      location: "South Bank",
      description: "Museum visit and dinner support with approved mileage claim.",
      participantIds: ["p5"],
      tags: ["community access", "transport"],
      tasks: [{ id: "task-17", title: "Submit participant outing summary", done: true }],
      checkedInAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      checkedOutAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(),
      actualWorkedMinutes: 370,
      initialStatus: "approved",
      allowances: [{ id: "allow-2", type: "Kilometres", amount: 24.6, notes: "Approved mileage claim" }],
    }),
    buildShift({
      id: "shift-1010",
      dayOffset: -10,
      startTime: "09:00",
      endTime: "12:00",
      rosterName: "Rejected timesheet example",
      location: "Virtual check-in",
      description: "Prototype example of rejected shift for workflow testing.",
      participantIds: ["p2"],
      tags: ["admin"],
      tasks: [{ id: "task-18", title: "Update service agreement note", done: true }],
      checkedInAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      checkedOutAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000).toISOString(),
      actualWorkedMinutes: 150,
      initialStatus: "rejected",
      generalNotes: "Rejected due to overlap with training booking.",
    }),
  ];

  const rosterTemplates = [
    {
      rosterName: "Morning personal care",
      startTime: "07:00",
      endTime: "15:00",
      breakDuration: 30,
      location: "Unit 5, New Farm",
      description: "Morning support including personal care, breakfast, and documentation.",
      participantIds: ["p1", "p4"],
      tags: ["personal care", "cleaning"],
      assets: ["House keys", "Medication chart"],
      documents: ["Daily support notes"],
    },
    {
      rosterName: "Short morning support",
      startTime: "06:00",
      endTime: "10:00",
      location: "Inner north SIL homes",
      description: "Short morning block covering wake-up routine, breakfast, and handover updates.",
      participantIds: ["p1", "p4"],
      tags: ["personal care", "handover"],
      assets: ["House phone", "Keys"],
      documents: ["Morning routine checklist"],
    },
    {
      rosterName: "Community access afternoon",
      startTime: "13:00",
      endTime: "19:00",
      location: "Brisbane community locations",
      description: "Support community participation, transport, and goal-based activity.",
      participantIds: ["p2", "p5"],
      tags: ["community access", "transport"],
      assets: ["Van access card"],
      documents: ["Community access plan"],
    },
    {
      rosterName: "Capacity building visit",
      startTime: "10:00",
      endTime: "12:00",
      location: "Northside community venues",
      description: "Short goal-focused visit for shopping practice, planning, or independent travel skills.",
      participantIds: ["p2"],
      tags: ["capacity building", "community access"],
      assets: ["Goal tracker"],
      documents: ["Goal progress worksheet"],
    },
    {
      rosterName: "Respite evening support",
      startTime: "15:00",
      endTime: "21:00",
      location: "Albany Creek respite house",
      description: "Evening support, meal assistance, and end-of-day handover.",
      participantIds: ["p3"],
      tags: ["respite", "meal support"],
      assets: ["Respite checklist"],
      documents: ["Evening routine sheet"],
    },
    {
      rosterName: "Clinic escort",
      startTime: "09:00",
      endTime: "13:00",
      location: "Metro North health sites",
      description: "Escort to appointment and document transport and outcomes.",
      participantIds: ["p5"],
      tags: ["appointment", "transport"],
      assets: ["Referral paperwork"],
      documents: ["Appointment referral"],
    },
    {
      rosterName: "Long day support",
      startTime: "08:00",
      endTime: "18:00",
      breakDuration: 30,
      location: "South Brisbane and home-based supports",
      description: "Long day combining personal care, community access, meal support, and end-of-day notes.",
      participantIds: ["p1", "p5"],
      tags: ["community access", "meal support"],
      assets: ["Vehicle logbook", "Medication chart"],
      documents: ["Daily support summary"],
    },
    {
      rosterName: "Evening community support",
      startTime: "16:00",
      endTime: "20:00",
      location: "Brisbane north community locations",
      description: "Afternoon and evening support for errands, dinner prep, and return-home routine.",
      participantIds: ["p2", "p5"],
      tags: ["community access", "meal support"],
      assets: ["Van access card"],
      documents: ["Community outing checklist"],
    },
  ];

  const singleShiftPatterns = [
    [{ templateIndex: 0, startTime: "07:00", endTime: "15:00", breakDuration: 30 }],
    [{ templateIndex: 5, startTime: "09:00", endTime: "13:00", breakDuration: 0 }],
    [{ templateIndex: 4, startTime: "15:00", endTime: "21:00", breakDuration: 0 }],
    [{ templateIndex: 6, startTime: "08:00", endTime: "18:00", breakDuration: 30 }],
    [{ templateIndex: 7, startTime: "16:00", endTime: "20:00", breakDuration: 0 }],
    [{ templateIndex: 3, startTime: "10:00", endTime: "12:00", breakDuration: 0 }],
  ];

  const doubleShiftPatterns = [
    [
      { templateIndex: 1, startTime: "06:00", endTime: "10:00", breakDuration: 0 },
      { templateIndex: 2, startTime: "15:00", endTime: "21:00", breakDuration: 0 },
    ],
    [
      { templateIndex: 0, startTime: "07:00", endTime: "11:00", breakDuration: 0 },
      { templateIndex: 7, startTime: "16:00", endTime: "20:00", breakDuration: 0 },
    ],
    [
      { templateIndex: 5, startTime: "09:00", endTime: "13:00", breakDuration: 0 },
      { templateIndex: 4, startTime: "17:00", endTime: "21:00", breakDuration: 0 },
    ],
  ];

  function getSleepoverDisturbances(status, dateKey, seedId) {
    if (status === "not_started") return [];
    if (status === "missing_check_out" || status === "in_progress") {
      return [
        {
          id: "dist-" + seedId + "-a",
          startDate: nextDateKey(dateKey),
          startTime: "03:10",
          endTime: "",
          durationMinutes: "",
        },
      ];
    }

    if (seedId % 2 === 0) return [];

    return [
      {
        id: "dist-" + seedId + "-a",
        startDate: nextDateKey(dateKey),
        startTime: "00:45",
        endTime: "01:05",
        durationMinutes: 20,
      },
      {
        id: "dist-" + seedId + "-b",
        startDate: nextDateKey(dateKey),
        startTime: "04:20",
        endTime: "04:35",
        durationMinutes: 15,
      },
    ];
  }

  function shiftSeedForStatus(
    status,
    dateKey,
    startTime,
    endTime,
    breakDuration,
    actualWorkedMinutesOverride
  ) {
    const startIso = isoDateTime(dateKey, startTime);
    const overnight = endTime < startTime;
    const endIso = isoDateTime(overnight ? nextDateKey(dateKey) : dateKey, endTime);
    const actualWorkedMinutes =
      actualWorkedMinutesOverride != null
        ? actualWorkedMinutesOverride
        : Math.max(
            0,
            (Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3, 5)) + (overnight ? 24 * 60 : 0)) -
              (Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5))) -
              (breakDuration || 0)
          );

    if (status === "approved" || status === "completed" || status === "rejected") {
      return {
        checkedInAt: startIso,
        checkedOutAt: endIso,
        actualWorkedMinutes,
        initialStatus: status,
        manualStatus: status === "approved" || status === "rejected" ? status : null,
        breakDuration: breakDuration || 0,
      };
    }

    if (status === "not_started") {
      return {
        checkedInAt: null,
        checkedOutAt: null,
        initialStatus: "not_started",
      };
    }

    return {
      checkedInAt: null,
      checkedOutAt: null,
      initialStatus: status,
    };
  }

  function generateExtendedShifts() {
    const generated = [];
    const existingDates = new Set(
      mockShifts.map(function (shift) {
        return shift.date + "|" + shift.rosterName;
      })
    );
    const baseMonday = getMonday(TODAY);
    let idCounter = 2000;

    for (let weekOffset = -4; weekOffset <= 6; weekOffset += 1) {
      const weekStart = addDays(baseMonday, weekOffset * 7);

      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const slotCount = (weekOffset + dayIndex + 14) % 4 === 0 ? 0 : (weekOffset + dayIndex) % 3 === 0 ? 2 : 1;
        if (slotCount === 0) continue;

        const dayDate = addDays(weekStart, dayIndex);
        const dateKey = formatDateKey(dayDate);
        const isSleepoverDay =
          dayIndex === 4 && (weekOffset === -2 || weekOffset === 1 || weekOffset === 4);
        const pattern = isSleepoverDay
          ? [
              {
                shiftType: "sleepover",
                rosterName: "Sleepover SIL",
                startTime: "18:00",
                endTime: "08:00",
                breakDuration: 0,
                location: "Unit 12, Indooroopilly",
                description:
                  "Evening active support, overnight sleepover, and morning handover in the SIL house.",
                participantIds: ["p1", "p3"],
                tags: ["sleepover", "handover"],
                assets: ["Sleepover checklist"],
                documents: ["Sleepover procedure"],
                paidSupportMinutes: 360,
                eveningSupport: "6:00pm - 10:00pm",
                morningSupport: "6:00am - 8:00am",
              },
            ]
          : (slotCount === 2
              ? doubleShiftPatterns[(dayIndex + weekOffset + 12) % doubleShiftPatterns.length]
              : singleShiftPatterns[(dayIndex + weekOffset + 12) % singleShiftPatterns.length]
            ).map(function (entry) {
              const template = rosterTemplates[entry.templateIndex];
              return Object.assign({}, entry, template, {
                shiftType: "standard",
                rosterName: template.rosterName,
                location: template.location,
                description: template.description,
                participantIds: template.participantIds,
                tags: template.tags,
                assets: template.assets,
                documents: template.documents,
              });
            });

        for (let slot = 0; slot < pattern.length; slot += 1) {
          const slotTemplate = pattern[slot];
          const status =
            weekOffset < 0
              ? ["completed", "approved", "rejected"][(dayIndex + slot + 6) % 3]
              : weekOffset > 0
                ? "not_started"
                : dayDate < TODAY
                  ? ["completed", "approved"][(dayIndex + slot) % 2]
                  : "not_started";
          const rosterName = slotTemplate.rosterName;

          if (existingDates.has(dateKey + "|" + rosterName)) continue;

          const baseSeed = {
            id: "shift-" + idCounter++,
            date: dateKey,
            startTime: slotTemplate.startTime,
            endTime: slotTemplate.endTime,
            breakDuration: slotTemplate.breakDuration || 0,
            rosterName: rosterName,
            location: slotTemplate.location,
            description: slotTemplate.description,
            participantIds: slotTemplate.participantIds,
            shiftType: slotTemplate.shiftType,
            tags: slotTemplate.tags,
            assets: slotTemplate.assets,
            documents: slotTemplate.documents,
            tasks: [
              { id: "task-" + idCounter + "-a", title: "Complete shift handover", done: status !== "not_started" },
              { id: "task-" + idCounter + "-b", title: "Update progress notes", done: status !== "not_started" },
            ],
          };

          if (slotTemplate.shiftType === "sleepover") {
            baseSeed.paidSupportMinutes = slotTemplate.paidSupportMinutes;
            baseSeed.eveningSupport = slotTemplate.eveningSupport;
            baseSeed.morningSupport = slotTemplate.morningSupport;
            baseSeed.disturbances = getSleepoverDisturbances(status, dateKey, idCounter);
          }

          Object.assign(
            baseSeed,
            shiftSeedForStatus(
              status,
              dateKey,
              baseSeed.startTime,
              baseSeed.endTime,
              baseSeed.breakDuration,
              slotTemplate.shiftType === "sleepover" ? slotTemplate.paidSupportMinutes : null
            )
          );

          generated.push(buildShift(baseSeed));
          existingDates.add(dateKey + "|" + rosterName);
        }
      }
    }

    return generated;
  }

  mockShifts.push.apply(mockShifts, generateExtendedShifts());

  APP.data = {
    TODAY,
    STATUS_META,
    FORMS_LIBRARY: [
      "Medication observation form",
      "Bowel chart",
      "Behaviour incident record",
      "Community access checklist",
      "Meal support form",
      "Progress against goals form",
    ],
    ALLOWANCE_OPTIONS: [
      { id: "meal", label: "Meal allowance", unitLabel: "Meals" },
      { id: "km", label: "Kilometre allowance", unitLabel: "Kilometres" },
      { id: "sleepover", label: "Sleepover allowance", unitLabel: "Nights" },
      { id: "laundry", label: "Laundry allowance", unitLabel: "Loads" },
    ],
    mockShifts,
  };
})();
