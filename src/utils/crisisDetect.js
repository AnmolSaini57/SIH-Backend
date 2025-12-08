// src/utils/crisisDetect.js
function isCrisisMessage(text = "") {
  const lowered = text.toLowerCase();

  const keywords = [
  // Root-word variants (covers suicide, suicidal, suiciding)
  "suicide",
  "suicidal",
  "suicidality",

  // Direct intent
  "kill myself",
  "killing myself",
  "want to kill myself",
  "kms",
  "kys",
  
  // Dying variations
  "i want to die",
  "i wanna die",
  "i wanna just die",
  "want to die",
  "want to just die",
  "wish i was dead",
  "wish i were dead",
  "better off dead",
  "dying inside",
  "i'm done with life",
  "done with life",
  "life is pointless",
  "life is meaningless",

  // Not wanting to live
  "i dont want to live",
  "i don't want to live",
  "i don't want to exist",
  "don't want to be alive",
  "i shouldn't exist",
  "i want to disappear",
  "i want to vanish",
  "i want everything to end",

  // End it all variations
  "end my life",
  "ending my life",
  "end it all",
  "thinking of ending everything",
  "end everything",
  "ending everything",

  // Self-harm various forms
  "self harm",
  "self-harm",
  "self harming",
  "self-harming",
  "hurt myself",
  "hurting myself",
  "cut myself",
  "cutting myself",
  "cutting",
  "slit my wrists",
  "slitting my wrists",



  // Method-related obvious intent
  "jump off a building",
  "jump off a bridge",
  "hang myself",
  "hanging myself",
  "crash my car intentionally",
  "drive into traffic",


];


  return keywords.some((k) => lowered.includes(k));
}

export { isCrisisMessage };
