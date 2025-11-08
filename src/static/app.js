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

  function createParticipantList(participants, activityName) {
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
      li.className = "participant-item";
      // Email span
      const emailSpan = document.createElement("span");
      emailSpan.textContent = email;
      // Delete icon
      const delBtn = document.createElement("button");
      delBtn.className = "delete-participant";
      delBtn.title = "Remove participant";
      delBtn.innerHTML = "&#128465;"; // Trash can emoji
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        unregisterParticipant(activityName, email, li);
      });
      li.appendChild(emailSpan);
      li.appendChild(delBtn);
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

      const listNode = createParticipantList(a.participants || [], name);
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

  // Unregister participant handler (calls backend API)
  function unregisterParticipant(activityName, email, liNode) {
    if (!activityName || !email) return;
    fetch(`/activities/${encodeURIComponent(activityName)}/unregister`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const detail = data.detail || res.statusText;
          throw new Error(detail);
        }
        return res.json();
      })
      .then((result) => {
        showMessage(result.message || `Unregistered ${email}`, "success");
        liNode.remove();
        // Update badge
        const card = liNode.closest('.activity-card');
        if (card) {
          const badge = card.querySelector('.participant-count');
          if (badge) {
            const parts = badge.textContent.split("/");
            let current = parseInt(parts[0] || "0", 10);
            const max = parts[1] || "?";
            current = isNaN(current) ? 0 : Math.max(0, current - 1);
            badge.textContent = `${current}/${max}`;
          }
        }
      })
      .catch((err) => {
        showMessage(err.message || "Failed to unregister participant", "error");
      });
  }

  // Fetch and render activities
  function fetchAndRenderActivities() {
    fetch("/activities")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load activities");
        return res.json();
      })
      .then((data) => renderActivities(data))
      .catch((err) => {
        activitiesListEl.innerHTML = `<p class="error">Unable to load activities: ${err.message}</p>`;
      });
  }

  // Initial load
  fetchAndRenderActivities();

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
        // Re-fetch and re-render activities to reflect the new participant
        fetchAndRenderActivities();
        signupForm.reset();
      })
      .catch((err) => {
        showMessage(err.message || "Signup failed", "error");
      });
  });
});
