# Support Worker Shift Prototype

Low-fidelity functional prototype for testing support worker shift workflows.

## Simple project structure

- `index.html`: static entry point
- `styles.css`: intentionally simple styling for layout and state visibility
- `src/data.js`: data model metadata and realistic mock shifts
- `src/state.js`: local in-memory store and workflow/status update rules
- `src/ui.js`: page rendering for schedule, menu, and shift detail tabs
- `src/app.js`: event wiring and app bootstrap

## Data model

Each shift includes:

- Core: `id`, `date`, `startTime`, `endTime`, `breakDuration`, `rosterName`, `location`, `description`
- Participants: `participants[]` with `id`, `name`, `flags`, `program`, `isNdis`, `contacts`, `emergencyInfo`
- Attributes: `shiftType`, `tags[]`, `assets[]`
- Workflow: `tasks[]`, `notes`, `documents[]`, `allowances[]`, `transportLogs[]`, `sleepover`
- Status: `status`, plus workflow timestamps in `workflow.checkedInAt`, `workflow.checkedOutAt`, `workflow.actualWorkedMinutes`, and `workflow.manualStatus`

## Prototype behaviours

- Schedule lands on the current week and supports moving forward through future weeks
- Shift cards open shift detail with horizontal tabs
- Check-in and check-out update status visibly
- Status also recalculates from timestamps for missing check-in/check-out and recent completion
- Notes, task toggles, attendance toggles, allowances, and transport logs persist in app state during the session

## Running

Open [index.html](/Users/bechumphrey/Documents/New project 2/index.html) in a browser.
