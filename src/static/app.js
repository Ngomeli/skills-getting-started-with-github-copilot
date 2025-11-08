document.addEventListener("DOMContentLoaded", () => {
  const activitiesListEl = document.getElementById("activities-list");
  const activitySelectEl = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageEl = document.getElementById("message");

  function showMessage(text, type = "info") {
    messageEl.className = `message ${type}`;
    messageEl.textContent = text;
    messageEl.classList.remove("hidden");
    setTimeout(() => {
      messageEl.classList.add("hidden");
    }, 4000);
  }

  function createParticipantList(participants) {
    if (!participants || participants.length === 0) {
      const p = document.createElement("div");
      p.className = "participants-empty";
      p.textContent = "No participants yet";
      return p;
    }

    const ul = document.createElement("ul");
    ul.className = "participants-list";
    participants.forEach((email) => {
      const li = document.createElement("li");
      li.textContent = email;
      ul.appendChild(li);
    });
    return ul;
  }

  function renderActivities(data) {
    activitiesListEl.innerHTML = "";
    // clear select options except placeholder
    for (let i = activitySelectEl.options.length - 1; i >= 1; i--) {
      activitySelectEl.remove(i);
    }

    Object.keys(data).forEach((name) => {
      const a = data[name];
      // Card
      const card = document.createElement("div");
      card.className = "activity-card";

      const title = document.createElement("h4");
      title.textContent = name;

      const countBadge = document.createElement("span");
      countBadge.className = "participant-count";
      const current = a.participants ? a.participants.length : 0;
      countBadge.textContent = `${current}/${a.max_participants || "?"}`;

      // Put badge next to title
      const titleWrapper = document.createElement("div");
      titleWrapper.style.display = "flex";
      titleWrapper.style.justifyContent = "space-between";
      titleWrapper.style.alignItems = "center";
      titleWrapper.appendChild(title);
      titleWrapper.appendChild(countBadge);

      const desc = document.createElement("p");
      desc.textContent = a.description;

      const sched = document.createElement("p");
      sched.textContent = `Schedule: ${a.schedule}`;

      // Participants section
      const participantsSection = document.createElement("div");
      participantsSection.className = "participants";

      const participantsHeading = document.createElement("h5");
      participantsHeading.textContent = "Participants";
      participantsSection.appendChild(participantsHeading);

      const listNode = createParticipantList(a.participants || []);
      participantsSection.appendChild(listNode);

      card.appendChild(titleWrapper);
      card.appendChild(desc);
      card.appendChild(sched);
      card.appendChild(participantsSection);

      activitiesListEl.appendChild(card);

      // add to select
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      activitySelectEl.appendChild(opt);
    });
  }

  // Fetch and render activities
  fetch("/activities")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load activities");
      return res.json();
    })
    .then((data) => renderActivities(data))
    .catch((err) => {
      activitiesListEl.innerHTML = `<p class="error">Unable to load activities: ${err.message}</p>`;
    });

  // Handle signup
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const activity = activitySelectEl.value;
    if (!email || !activity) {
      showMessage("Please enter an email and select an activity.", "error");
      return;
    }

    const url = `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`;
    fetch(url, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const detail = data.detail || res.statusText;
          throw new Error(detail);
        }
        return res.json();
      })
      .then((result) => {
        showMessage(result.message || "Signed up successfully!", "success");
        // Update UI: add email to the participants list for that activity
        // Find the card for the activity
        const cards = Array.from(document.getElementsByClassName("activity-card"));
        const matching = cards.find((card) => {
          const h4 = card.querySelector("h4");
          return h4 && h4.textContent === activity;
        });
        if (matching) {
          const ul = matching.querySelector(".participants-list");
          if (ul) {
            const li = document.createElement("li");
            li.textContent = email;
            ul.appendChild(li);
          } else {
            // replace "No participants yet" with a new list
            const empty = matching.querySelector(".participants-empty");
            const parent = empty ? empty.parentNode : null;
            if (empty && parent) {
              const newList = createParticipantList([email]);
              parent.replaceChild(newList, empty);
            }
          }
          // update count badge
          const badge = matching.querySelector(".participant-count");
          if (badge) {
            // attempt to parse current/ max, increment current
            const parts = badge.textContent.split("/");
            let current = parseInt(parts[0] || "0", 10);
            const max = parts[1] || "?";
            current = isNaN(current) ? 1 : current + 1;
            badge.textContent = `${current}/${max}`;
          }
        }
        signupForm.reset();
      })
      .catch((err) => {
        showMessage(err.message || "Signup failed", "error");
      });
  });
});
