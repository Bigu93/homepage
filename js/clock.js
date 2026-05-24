// js/clock.js
// Updates the clock + date + greeting every second.

let usernameRef = "Marcin";

export function setUsername(name) {
  usernameRef = name || "there";
  tick(); // refresh greeting immediately
}

function tick() {
  const clock = document.getElementById("clock");
  const dateDisplay = document.getElementById("date-display");
  const greeting = document.getElementById("greeting");
  if (!clock || !dateDisplay || !greeting) return;

  const now = new Date();
  clock.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  dateDisplay.textContent = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const hour = now.getHours();
  let salutation = "Good Evening,";
  if (hour < 12) salutation = "Good Morning,";
  else if (hour < 18) salutation = "Good Afternoon,";
  greeting.textContent = `${salutation} ${usernameRef}`;
}

export function startClock(username) {
  if (username) usernameRef = username;
  tick();
  setInterval(tick, 1000);
}
