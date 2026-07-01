document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupContainer = document.getElementById("signup-container");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const userMenuBtn = document.getElementById("user-menu-btn");
  const authPopover = document.getElementById("auth-popover");
  const authStatus = document.getElementById("auth-status");
  const openLoginBtn = document.getElementById("open-login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const closeLoginBtn = document.getElementById("close-login-btn");
  const loginForm = document.getElementById("login-form");
  const authRequiredNote = document.createElement("p");

  const AUTH_TOKEN_KEY = "teacherAuthToken";
  const AUTH_USER_KEY = "teacherUsername";

  authRequiredNote.className = "auth-required-note";
  authRequiredNote.textContent = "Teacher login required to register or unregister students.";
  signupContainer.appendChild(authRequiredNote);

  function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  function getTeacherName() {
    return localStorage.getItem(AUTH_USER_KEY);
  }

  function isTeacherLoggedIn() {
    return Boolean(getAuthToken());
  }

  function getAuthHeaders() {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function showMessage(text, kind) {
    messageDiv.textContent = text;
    messageDiv.className = kind;
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateAuthUI() {
    const loggedIn = isTeacherLoggedIn();
    const teacherName = getTeacherName();

    document.body.classList.toggle("teacher-mode", loggedIn);
    authStatus.textContent = loggedIn
      ? `Logged in as ${teacherName}`
      : "Not logged in";

    openLoginBtn.classList.toggle("hidden", loggedIn);
    logoutBtn.classList.toggle("hidden", !loggedIn);

    authRequiredNote.classList.toggle("hidden", loggedIn);

    signupForm
      .querySelectorAll("input, select, button")
      .forEach((field) => {
        field.disabled = !loggedIn;
      });
  }

  function setAuthState(token, username) {
    if (token && username) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(AUTH_USER_KEY, username);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    }
    updateAuthUI();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        isTeacherLoggedIn()
                          ? `<button class="delete-btn teacher-only" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  userMenuBtn.addEventListener("click", () => {
    authPopover.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("#auth-controls")) {
      authPopover.classList.add("hidden");
    }
  });

  openLoginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    authPopover.classList.add("hidden");
  });

  closeLoginBtn.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginForm.reset();
  });

  loginModal.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "Login failed", "error");
        return;
      }

      setAuthState(result.token, result.username);
      loginModal.classList.add("hidden");
      loginForm.reset();
      showMessage("Teacher login successful", "success");
      fetchActivities();
    } catch (error) {
      console.error("Error logging in:", error);
      showMessage("Failed to login. Please try again.", "error");
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }

    setAuthState(null, null);
    authPopover.classList.add("hidden");
    fetchActivities();
    showMessage("Logged out", "info");
  });

  // Initialize app
  updateAuthUI();
  fetchActivities();
});
