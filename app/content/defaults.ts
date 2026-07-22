import type { NewsletterContent } from "./types";

// The canonical starting content — a byte-for-byte reproduction of what the
// pages rendered before the editor existed. This is also the fallback whenever
// the database is unavailable or empty, so the public site always renders.
export const defaultContent: NewsletterContent = {
  shared: {
    brandName: "CFA West Bryan",
    brandTagline: "Team newsletter",
    navHeading: "Explore this week",
    navLinks: [
      { label: "Home", href: "/" },
      { label: "Action required", href: "/training" },
      { label: "Results", href: "/results" },
      { label: "Events", href: "/#events" },
      { label: "Recognition", href: "/#recognition" },
      { label: "Grow with us", href: "/#grow" },
    ],
    detailBackLabel: "This week",
  },
  home: {
    hero: {
      kicker: "Team update · July 10, 2026",
      headline: "Your week, made simple.",
    },
    overview: {
      eyebrow: "Week of July 12",
      heading: "This week, at a glance",
      intro: "Three quick things to know before your next shift.",
      actionCard: {
        icon: "CP",
        label: "Action required",
        heading: "CommercePoint training",
        bodyPrefix: "Front of House · Pathway due ",
        bodyEmphasis: "July 28",
        micro: "New system launches August 4",
        linkLabel: "View training steps",
        linkHref: "/training",
      },
      eventCard: {
        icon: "14",
        kicker: "Tuesday",
        title: "Cow Appreciation Day",
        detail: "July 14",
        href: "#events",
      },
      recognitionCard: {
        icon: "★",
        kicker: "Customer shout-out",
        title: "Celebrate Catye & Richie",
        detail: "Recognized in guest surveys",
        href: "#recognition",
      },
    },
    scorecard: {
      eyebrow: "June scorecard",
      heading: "Guest experience",
      intro: "Strong month, with one clear focus for the team.",
      resultAria: "5 of 6 goals met",
      resultValue: "5",
      resultUnit: "of 6",
      resultLabel: "goals met",
      focusLabel: "Needs focus",
      focusValue: "Speed of service · 3:10",
      buttonLabel: "View June results",
      buttonHref: "/results",
    },
    recognition: {
      eyebrow: "People make the place",
      heading: "Worth celebrating",
      feature: {
        heading: "Way to go, Catye & Richie!",
        body: "Guests called out your great work in their surveys. Thank you for making people feel cared for.",
      },
      birthday: {
        kicker: "Birthday",
        name: "Aubri G.",
        date: "July 14",
      },
      anniversaries: {
        kicker: "Work anniversaries",
        entries: [
          { name: "Ava G. · July 9", detail: "1 year at CFA" },
          { name: "Harper O. · July 17", detail: "1 year at CFA" },
        ],
      },
    },
    events: {
      eyebrow: "Plan ahead",
      heading: "What’s happening nearby",
      intro: "Local events may bring extra traffic. Arrive ready and take care of one another.",
      items: [
        { date: "Jul 12–16", name: "TAMU Tennis Camp" },
        { date: "Jul 12–17", name: "TEEX Industrial Fire School" },
        { date: "Jul 14–17", name: "New Student Conference (NSC)" },
        { date: "Jul 14", name: "Cow Appreciation Day", featured: true },
        {
          date: "Jul 15–20",
          name: "Prime: Alliance Fastpitch Southern Championship",
        },
        {
          date: "Jul 16–18",
          name: "NXTPro Puma National Championship — Basketball",
        },
        { date: "Jul 18", name: "State 4-H Horse Show" },
      ],
    },
    grow: {
      eyebrow: "Grow with us",
      heading: "Interested in leadership?",
      body: "Review the role and hour requirements, share your questions, and start a conversation with the leadership team.",
      buttonLabel: "View interest form",
      buttonHref:
        "https://docs.google.com/forms/d/e/1FAIpQLScDaXKd52Bv2AMbXEJlszaiRcpihAoWcsJ9ZKbgN7MfJUx2bw/viewform",
      referralStrong: "Referral bonus opportunity:",
      referralRest: "Know someone who would be a great fit? Ask a leader for current details.",
    },
    footer: {
      brand: "CFA West Bryan",
      line: "Team newsletter · July 10, 2026",
    },
    signin: {
      eyebrow: "Before you go",
      heading: "Mark this as read",
      lead: "Add your name so we know you’ve seen this week’s update.",
      buttonLabel: "I've read this",
      doneHeading: "You're checked in",
      doneBody: "the team knows you’ve read this week’s update.",
    },
    heroImage: "",
  },
  training: {
    badge: "Action required",
    heading: "CommercePoint training",
    lead: "Front of House team members: complete your assigned Pathway training before the new system arrives.",
    statusRows: [
      {
        token: "FOH",
        tokenRed: false,
        label: "Who",
        strongPrefix: "Front of House team members",
        strongEmphasis: "",
      },
      {
        token: "28",
        tokenRed: true,
        label: "Deadline",
        strongPrefix: "Complete Pathway training by ",
        strongEmphasis: "July 28",
      },
      {
        token: "04",
        tokenRed: false,
        label: "Launch",
        strongPrefix: "New system launches ",
        strongEmphasis: "August 4",
      },
    ],
    primaryButton: { label: "Complete training", href: "https://www.cfahome.com/" },
    helpLink: { label: "Need help? Ask a leader", href: "#leader-help" },
    alert: {
      kicker: "Important scheduling note",
      body: "Team members who have not completed training by July 28 will not be scheduled until it is complete. This helps everyone arrive prepared for launch day.",
    },
    covers: {
      eyebrow: "Inside Pathway",
      heading: "What the training covers",
      items: [
        "An overview of CommercePoint and why Chick-fil-A is making the change",
        "Official training videos",
        "Time to explore the new system",
        "A guided Time Trial to practice the new workflow",
      ],
    },
    why: {
      eyebrow: "Why it matters",
      heading: "Same purpose, new tools",
      paragraphs: [
        "CommercePoint will handle orders, payments, rewards, and kitchen routing. The job stays familiar, but the screens, tablets, and registers will be different.",
        "It’s one of our biggest technology updates in recent years. Practicing ahead of time will help us create a smooth transition for teammates and guests.",
      ],
    },
    help: {
      mark: "?",
      heading: "Need a hand?",
      body: "Ask the leader on duty for help finding the assignment or accessing your Pathway login credentials.",
    },
  },
  results: {
    eyebrow: "June scorecard",
    heading: "Guest experience",
    lead: "The team hit nearly every target. Now let’s turn one focus area into our next win.",
    summaryAria: "Five of six goals met",
    summaryValue: "5",
    summaryUnit: "of 6",
    summaryLabel: "goals met",
    headlineMetrics: [
      {
        label: "Overall satisfaction",
        value: "84%",
        goal: "Goal 83%",
        status: "On track",
        positive: true,
      },
      {
        label: "Taste of food",
        value: "86%",
        goal: "Goal 83%",
        status: "On track",
        positive: true,
      },
      {
        label: "Speed of service",
        value: "3:10",
        goal: "Goal 3:08",
        status: "Needs focus",
        positive: false,
      },
    ],
    focus: {
      label: "This month’s focus",
      heading: "Win back two seconds",
      body: "Keep handoffs clear, stay ready for the next order, and ask for support before a rush becomes a bottleneck.",
    },
    scorecard: {
      eyebrow: "The full picture",
      heading: "Three-month scorecard",
      headerMeasure: "Measure",
      headerGoal: "Goal",
      headerApr: "Apr",
      headerMay: "May",
      headerJun: "Jun",
      rows: [
        { label: "Overall satisfaction", april: "85%", may: "84%", june: "84%", goal: "83%" },
        { label: "Taste of food", april: "84%", may: "84%", june: "86%", goal: "83%" },
        { label: "Speed of service CEM", april: "78%", may: "77%", june: "79%", goal: "78%" },
        { label: "Speed of service time", april: "3:12", may: "3:10", june: "3:10", goal: "3:08" },
        { label: "Attentive / friendly", april: "83%", may: "86%", june: "84%", goal: "84%" },
        { label: "Order accuracy", april: "97%", may: "96%", june: "97%", goal: "96%" },
      ],
    },
    momentum: {
      heading: "Great work, team.",
      body: "Five goals met is worth celebrating. Let’s keep the momentum going.",
    },
  },
};
