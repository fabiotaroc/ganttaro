# Chart keyboard interaction

The Chart follows the APG grid pattern: one grid, rows, and two gridcells per
Item (name and dates), with one roving tab stop. Arrow keys navigate; Home/End
and Ctrl+Home/End follow the grid focus behavior. Enter on dates opens details.
F2 or double-click on a name starts inline editing; Enter saves, Escape cancels.
Alt+Left/Right moves dates; Alt+Shift+Left/Right resizes the end. Space on the
name starts keyboard reordering; arrows move and Space drops, Escape cancels.
C on dates starts a Dependency; arrows select the target and Enter confirms.
Delete on dates removes the Item. Deleting the focused Item recovers focus to
another remaining gridcell. Dependency arrows can be focused, then Delete removes
them; the Comes after Combobox offers the same operation in details.

View Links expose grid navigation and details only. Every editing action has a
server-side Edit Link check. Empty names remain navigable and are flagged.
