// Healthcare-specific wording for the shared strategy library. Display only; the strategy IDs are unchanged.
export const HEALTHCARE_STEPS: Record<string, [string, string, string]> = {
  'workload-scheduling': ['Map shift coverage gaps with charge staff for the busiest shifts, including nights and weekends.', 'Redistribute avoidable tasks and agree a fair float or cover rota with staff input.', 'Check weekly that scheduled breaks are actually taken, and adjust the trial roster.'],
  'workload-resources': ['Compare patient load, acuity, and staffing by shift over four weeks.', 'Choose one recurring resource gap with the team, such as equipment, support staff, or float cover.', 'Trial a feasible fix and record staff feedback at handover reviews.'],
  'support-checkins': ['Hold a short weekly check-in or huddle on every shift, including nights.', 'Ask about one barrier to safe, manageable work and agree a practical response.', 'Report back on actions taken without identifying anyone who raised a concern.'],
  'support-training': ['Practise active listening and fair feedback with charge staff and supervisors.', 'Agree response times for staff concerns about safety, breaks, or rotas.', 'Review aggregated team feedback and adjust supervisor practices.'],
  'career-pathways': ['Ask staff which clinical or leadership skills they want to build.', 'List realistic options such as competencies, rotations, or in-service sessions.', 'Protect learning time on the roster across day and night shifts.'],
  'career-mentoring': ['Invite voluntary pairing of experienced and newer staff.', 'Agree one specific skill goal for each pair.', 'Protect mentoring time on the roster and review progress at 30 days.'],
  'satisfaction-jobdesign': ['Ask staff which tasks pull time away from patient care.', 'Co-design one change that adds autonomy or feedback, such as end-of-shift debriefs.', 'Trial the change and review aggregated feedback.'],
  'satisfaction-listening': ['Gather anonymous suggestions at huddles or through a suggestion box.', 'Agree one achievable unit priority with staff.', 'Share what changed and invite follow-up feedback.'],
};

export const addDays = (days: number, from = new Date()) => new Date(from.getTime() + days * 86400000).toISOString().slice(0, 10);
