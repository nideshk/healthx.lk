/**
 * English copy added for the public home redesign.
 * Existing sentences stay in the next-intl catalogs (en.json / si.json).
 * Sinhala for these strings is not included yet.
 */
export const homeRedesignCopy = {
  bookConsultation: "Book a consultation",
  photoSlot: "Photo",
  howItWorks: {
    steps: [
      {
        title: "Choose a specialty",
        text: "On the home page, select the specialty you need.",
      },
      {
        title: "Choose a doctor and a time",
        text: "Choose a doctor, then confirm a date and time.",
      },
      {
        title: "Finish the booking",
        text: "Sign in or create an account, then complete your profile, consent, and pre-consultation details. After payment you receive an email with the appointment confirmation and video link.",
      },
    ],
  },
  doctors: {
    title: "Meet some of our doctors",
    empty: "Listed doctors will show here.",
  },
  family: {
    title: "Looking after family and ageing parents from abroad",
    text: "You can create an account for a family member and attend the consultation with them.",
  },
} as const;
