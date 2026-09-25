/* =========================================================
   MY ACADEMIC VAULT
   SUPABASE + ANDROID / ACODE FRIENDLY APP
   =========================================================
   Stores:
   - Academic results
   - Assignments
   - Mid-semester results
   - End-semester results
   - Fees payments
   - Student union fees
   - Payment receipts
   - Academic documents
   - Student profile

   Expected Supabase object from config.js:
   window.academicVaultSupabase
========================================================= */


/* =========================================================
   GLOBAL DATA
========================================================= */

let db = null;
let currentUser = null;

let semesters = [];
let modules = [];
let records = [];
let payments = [];
let documents = [];


/* =========================================================
   BASIC HELPERS
========================================================= */

const $ = (id) => document.getElementById(id);

function show(id) {
  $(id)?.classList.remove("hidden");
}

function hide(id) {
  $(id)?.classList.add("hidden");
}

function today() {
  return new Date().toISOString().split("T")[0];
}


/* =========================================================
   MONEY FORMAT
========================================================= */

function money(value) {
  return new Intl.NumberFormat("en-MW", {
    style: "currency",
    currency: "MWK",
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}


/* =========================================================
   SAFE HTML
========================================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   TOAST
========================================================= */

function toast(text) {

  const el = $("toast");

  if (!el) return;

  el.textContent = text;

  el.classList.add("show");

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {

    el.classList.remove("show");

  }, 3000);
}


/* =========================================================
   FORM MESSAGE
========================================================= */

function message(id, text, success = false) {

  const el = $(id);

  if (!el) return;

  el.textContent = text;

  el.style.color =
    success
      ? "#217346"
      : "#b42318";
}


/* =========================================================
   MODAL
========================================================= */

function closeModal(id) {

  $(id)?.classList.add("hidden");

}


/* =========================================================
   FIND SEMESTER
========================================================= */

function getSemester(year, semester) {

  return semesters.find(
    s =>
      Number(s.academic_year) === Number(year) &&
      Number(s.semester) === Number(semester)
  );

}


/* =========================================================
   FIND MODULE
========================================================= */

function getModule(moduleId) {

  return modules.find(
    module =>
      module.id === moduleId
  );

}


/* =========================================================
   FIND MODULE SEMESTER
========================================================= */

function getModuleSemester(moduleId) {

  const module = getModule(moduleId);

  if (!module) return null;

  return semesters.find(
    semester =>
      semester.id === module.semester_id
  ) || null;

}


/* =========================================================
   STARTUP
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  init
);


async function init() {

  if (!window.academicVaultSupabase) {

    console.error(
      "academicVaultSupabase was not found. Check config.js."
    );

    show("authShell");

    show("loginScreen");

    hide("signupScreen");

    hide("app");

    return;
  }


  db =
    window.academicVaultSupabase;


  bindEvents();


  await checkAuth();

}


/* =========================================================
   EVENT BINDINGS
========================================================= */

function bindEvents() {


  /* LOGIN */

  $("loginForm")?.addEventListener(
    "submit",
    handleLogin
  );


  /* SIGNUP */

  $("signupForm")?.addEventListener(
    "submit",
    handleSignup
  );


  /* AUTH SCREEN */

  $("showSignupBtn")?.addEventListener(
    "click",
    openSignup
  );


  $("showLoginBtn")?.addEventListener(
    "click",
    openLogin
  );


  /* LOGOUT */

  $("logoutBtn")?.addEventListener(
    "click",
    handleLogout
  );


  /* MODULE */

  $("addModuleBtn")?.addEventListener(
    "click",
    openModuleModal
  );


  $("moduleForm")?.addEventListener(
    "submit",
    saveModule
  );


  /* RESULT */

  $("resultForm")?.addEventListener(
    "submit",
    saveResult
  );


  /* ASSIGNMENT */

  $("addAssignmentBtn")?.addEventListener(
    "click",
    openAssignmentModal
  );


  $("assignmentForm")?.addEventListener(
    "submit",
    saveAssignment
  );


  /* PAYMENT */

  $("addPaymentBtn")?.addEventListener(
    "click",
    openPaymentModal
  );


  $("paymentForm")?.addEventListener(
    "submit",
    savePayment
  );


  /* PROFILE */

  $("profileForm")?.addEventListener(
    "submit",
    saveProfile
  );


  /* RESULTS FILTERS */

  $("resultsYearFilter")?.addEventListener(
    "change",
    renderModules
  );


  $("resultsSemesterFilter")?.addEventListener(
    "change",
    renderModules
  );


  /* MOBILE MENU */

  $("mobileMenuBtn")?.addEventListener(
    "click",
    () => {

      $("sidebar")
        ?.classList
        .toggle("open");

    }
  );


  /* NAVIGATION */

  document
    .querySelectorAll(".nav-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          switchSection(
            button.dataset.section
          );

          $("sidebar")
            ?.classList
            .remove("open");

        }
      );

    });


  /* QUICK BUTTONS */

  document
    .querySelectorAll(".quick-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          switchSection(
            button.dataset.section
          );

        }
      );

    });


  /* CLOSE BUTTONS */

  document
    .querySelectorAll("[data-close]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          closeModal(
            button.dataset.close
          );

        }
      );

    });


  /* CLOSE MODAL WHEN CLICKING BACKDROP */

  document
    .querySelectorAll(".modal")
    .forEach(modal => {

      modal.addEventListener(
        "click",
        event => {

          if (
            event.target === modal
          ) {

            modal.classList.add(
              "hidden"
            );

          }

        }
      );

    });

}


/* =========================================================
   AUTHENTICATION
========================================================= */

async function checkAuth() {

  const {
    data,
    error
  } =
    await db.auth.getSession();


  if (error) {

    console.error(error);

    openLogin();

    return;
  }


  if (data?.session?.user) {

    currentUser =
      data.session.user;

    await openApp();

  } else {

    openLogin();

  }


  /* LISTEN FOR AUTH CHANGES */

  db.auth.onAuthStateChange(
    (_event, session) => {

      if (
        session?.user &&
        !currentUser
      ) {

        currentUser =
          session.user;

        setTimeout(
          () => openApp(),
          0
        );

      }


      if (
        !session &&
        currentUser
      ) {

        currentUser = null;

        semesters = [];
        modules = [];
        records = [];
        payments = [];
        documents = [];

        openLogin();

      }

    }
  );

}


/* =========================================================
   OPEN LOGIN
========================================================= */

function openLogin() {

  show("authShell");

  show("loginScreen");

  hide("signupScreen");

  hide("app");

}


/* =========================================================
   OPEN SIGNUP
========================================================= */

function openSignup() {

  show("authShell");

  hide("loginScreen");

  show("signupScreen");

  hide("app");

}


/* =========================================================
   LOGIN
========================================================= */

async function handleLogin(event) {

  event.preventDefault();

  message(
    "loginMessage",
    ""
  );


  const email =
    $("loginEmail")
      .value
      .trim();


  const password =
    $("loginPassword")
      .value;


  if (!email || !password) {

    message(
      "loginMessage",
      "Enter your email and password."
    );

    return;
  }


  const {
    error
  } =
    await db.auth.signInWithPassword({

      email,

      password

    });


  if (error) {

    message(
      "loginMessage",
      error.message
    );

    return;
  }


  toast(
    "Login successful."
  );

}


/* =========================================================
   CREATE ACCOUNT
========================================================= */

async function handleSignup(event) {

  event.preventDefault();

  message(
    "signupMessage",
    ""
  );


  const fullName =
    $("signupName")
      .value
      .trim();


  const email =
    $("signupEmail")
      .value
      .trim();


  const password =
    $("signupPassword")
      .value;


  if (!fullName) {

    message(
      "signupMessage",
      "Enter your full name."
    );

    return;
  }


  if (!email) {

    message(
      "signupMessage",
      "Enter your email address."
    );

    return;
  }


  if (password.length < 6) {

    message(
      "signupMessage",
      "Password must be at least 6 characters."
    );

    return;
  }


  const {
    data,
    error
  } =
    await db.auth.signUp({

      email,

      password,

      options: {

        data: {

          full_name:
            fullName

        }

      }

    });


  if (error) {

    message(
      "signupMessage",
      error.message
    );

    return;
  }


  if (data?.session) {

    currentUser =
      data.user;


    toast(
      "Account created."
    );


    await openApp();


  } else {

    message(
      "signupMessage",
      "Account created. Check your email to confirm your account.",
      true
    );

  }

}


/* =========================================================
   LOGOUT
========================================================= */

async function handleLogout() {

  await db.auth.signOut();


  currentUser = null;


  semesters = [];
  modules = [];
  records = [];
  payments = [];
  documents = [];


  openLogin();


  toast(
    "Signed out."
  );

}


/* =========================================================
   OPEN APPLICATION
========================================================= */

async function openApp() {

  hide("authShell");

  show("app");


  await loadAll();


  await loadProfile();


  renderAll();

}


/* =========================================================
   LOAD EVERYTHING
========================================================= */

async function loadAll() {

  if (!currentUser) return;


  await ensureSemesters();


  await Promise.all([

    loadSemesters(),

    loadModules(),

    loadRecords(),

    loadPayments(),

    loadDocuments()

  ]);

}


/* =========================================================
   CREATE 8 SEMESTERS AUTOMATICALLY
=========================================================

   Year 1 Semester 1
   Year 1 Semester 2

   Year 2 Semester 1
   Year 2 Semester 2

   Year 3 Semester 1
   Year 3 Semester 2

   Year 4 Semester 1
   Year 4 Semester 2
========================================================= */

async function ensureSemesters() {

  const {
    data,
    error
  } =
    await db
      .from("semesters")
      .select(
        "id, academic_year, semester"
      )
      .eq(
        "user_id",
        currentUser.id
      );


  if (error) {

    console.error(
      "Could not check semesters:",
      error
    );

    return;
  }


  const existing =
    data || [];


  const missing = [];


  for (
    let year = 1;
    year <= 4;
    year++
  ) {

    for (
      let semester = 1;
      semester <= 2;
      semester++
    ) {

      const exists =
        existing.some(
          item =>
            Number(
              item.academic_year
            ) === year &&
            Number(
              item.semester
            ) === semester
        );


      if (!exists) {

        missing.push({

          user_id:
            currentUser.id,

          academic_year:
            year,

          semester:
            semester,

          label:
            `Year ${year} · Semester ${semester}`

        });

      }

    }

  }


  if (!missing.length) return;


  const {
    error: insertError
  } =
    await db
      .from("semesters")
      .insert(
        missing
      );


  if (insertError) {

    console.error(
      "Could not create semesters:",
      insertError
    );

  }

}


/* =========================================================
   LOAD SEMESTERS
========================================================= */

async function loadSemesters() {

  const {
    data,
    error
  } =
    await db
      .from("semesters")
      .select("*")
      .eq(
        "user_id",
        currentUser.id
      )
      .order(
        "academic_year"
      )
      .order(
        "semester"
      );


  if (error) {

    console.error(
      "Loading semesters failed:",
      error
    );

    return;
  }


  semesters =
    data || [];

}


/* =========================================================
   LOAD MODULES
========================================================= */

async function loadModules() {

  const {
    data,
    error
  } =
    await db
      .from("modules")
      .select("*")
      .eq(
        "user_id",
        currentUser.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      "Loading modules failed:",
      error
    );

    return;
  }


  modules =
    data || [];

}


/* =========================================================
   LOAD ACADEMIC RECORDS
========================================================= */

async function loadRecords() {

  const {
    data,
    error
  } =
    await db
      .from("academic_records")
      .select("*")
      .eq(
        "user_id",
        currentUser.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      "Loading records failed:",
      error
    );

    return;
  }


  records =
    data || [];

}


/* =========================================================
   LOAD PAYMENTS
========================================================= */

async function loadPayments() {

  const {
    data,
    error
  } =
    await db
      .from("payments")
      .select("*")
      .eq(
        "user_id",
        currentUser.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      "Loading payments failed:",
      error
    );

    return;
  }


  payments =
    data || [];

}


/* =========================================================
   LOAD DOCUMENTS
========================================================= */

async function loadDocuments() {

  const {
    data,
    error
  } =
    await db
      .from("documents")
      .select("*")
      .eq(
        "user_id",
        currentUser.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      "Loading documents failed:",
      error
    );

    return;
  }


  documents =
    data || [];

}


/* =========================================================
   DASHBOARD
========================================================= */

function populateDashboard() {

  if (!$("moduleCount")) return;


  $("moduleCount").textContent =
    modules.length;


  $("recordCount").textContent =
    records.length;


  $("paymentCount").textContent =
    payments.length;


  $("documentCount").textContent =
    documents.length;


  const profileName =
    $("profileName")
      ?.value
      ?.trim();


  const userName =
    profileName ||
    currentUser
      ?.user_metadata
      ?.full_name ||
    "Student";


  if ($("welcomeName")) {

    $("welcomeName").textContent =
      `Welcome, ${userName}`;

  }

}


/* =========================================================
   DASHBOARD SEMESTER CARDS
========================================================= */

function renderSemesters() {

  const container =
    $("semesterProgress");


  if (!container) return;


  if (!semesters.length) {

    container.innerHTML = `
      <div class="empty-state">
        No semesters available yet.
      </div>
    `;

    return;
  }


  container.innerHTML =
    semesters
      .map(semester => {

        const semesterModules =
          modules.filter(
            module =>
              module.semester_id ===
              semester.id
          );


        const semesterRecords =
          records.filter(
            record => {

              const module =
                getModule(
                  record.module_id
                );

              return (
                module &&
                module.semester_id ===
                semester.id
              );

            }
          );


        return `
          <div class="semester-card">

            <strong>
              ${escapeHTML(
                semester.label ||
                `Year ${semester.academic_year} · Semester ${semester.semester}`
              )}
            </strong>

            <span>
              ${semesterModules.length}
              module${semesterModules.length === 1 ? "" : "s"}
            </span>

            <small>
              ${semesterRecords.length}
              academic record${semesterRecords.length === 1 ? "" : "s"}
            </small>

          </div>
        `;

      })
      .join("");

}


/* =========================================================
   MODULE MODAL
========================================================= */

function openModuleModal() {

  $("moduleForm")
    ?.reset();


  $("moduleMessage").textContent =
    "";


  $("moduleModal")
    ?.classList
    .remove("hidden");

}


/* =========================================================
   SAVE MODULE
========================================================= */

async function saveModule(event) {

  event.preventDefault();


  message(
    "moduleMessage",
    ""
  );


  const year =
    Number(
      $("moduleYear").value
    );


  const semester =
    Number(
      $("moduleSemester").value
    );


  const semesterRow =
    getSemester(
      year,
      semester
    );


  if (!semesterRow) {

    message(
      "moduleMessage",
      "The selected semester could not be found."
    );

    return;
  }


  const moduleName =
    $("moduleName")
      .value
      .trim();


  if (!moduleName) {

    message(
      "moduleMessage",
      "Enter the module name."
    );

    return;
  }


  const {
    error
  } =
    await db
      .from("modules")
      .insert({

        user_id:
          currentUser.id,

        semester_id:
          semesterRow.id,

        module_code:
          $("moduleCode")
            .value
            .trim(),

        module_name:
          moduleName,

        credits:
          $("moduleCredits")
            .value
            ? Number(
                $("moduleCredits")
                  .value
              )
            : null,

        lecturer:
          $("moduleLecturer")
            .value
            .trim()

      });


  if (error) {

    message(
      "moduleMessage",
      error.message
    );

    return;
  }


  closeModal(
    "moduleModal"
  );


  await loadModules();


  renderAll();


  toast(
    "Module added successfully."
  );

}


/* =========================================================
   RENDER MODULES
========================================================= */

function renderModules() {

  const container =
    $("modulesContainer");


  if (!container) return;


  let filtered =
    [...modules];


  const year =
    $("resultsYearFilter")
      ?.value ||
    "";


  const semester =
    $("resultsSemesterFilter")
      ?.value ||
    "";


  if (
    year ||
    semester
  ) {

    filtered =
      filtered.filter(
        module => {

          const sem =
            semesters.find(
              s =>
                s.id ===
                module.semester_id
            );


          if (!sem) {
            return false;
          }


          return (

            (
              !year ||
              String(
                sem.academic_year
              ) === year
            )

            &&

            (
              !semester ||
              String(
                sem.semester
              ) === semester
            )

          );

        }
      );

  }


  if (!filtered.length) {

    container.innerHTML = `
      <div class="empty-state">

        No modules found.

        <br>

        Add your first module to begin.

      </div>
    `;

    return;
  }


  container.innerHTML =
    filtered
      .map(module => {

        const sem =
          semesters.find(
            s =>
              s.id ===
              module.semester_id
          );


        const moduleRecords =
          records.filter(
            record =>
              record.module_id ===
              module.id
          );


        return `

          <article
            class="module-card"
          >

            <div
              class="module-top"
            >

              <div>

                <div
                  class="module-code"
                >
                  ${escapeHTML(
                    module.module_code ||
                    "MODULE"
                  )}
                </div>

                <h3>
                  ${escapeHTML(
                    module.module_name
                  )}
                </h3>

                <div
                  class="module-meta"
                >

                  ${
                    sem
                      ? escapeHTML(
                          sem.label ||
                          `Year ${sem.academic_year} · Semester ${sem.semester}`
                        )
                      : ""
                  }

                  ${
                    module.credits
                      ? ` · ${module.credits} credits`
                      : ""
                  }

                  ${
                    module.lecturer
                      ? ` · ${escapeHTML(
                          module.lecturer
                        )}`
                      : ""
                  }

                </div>

              </div>


              <strong>
                ${moduleRecords.length}
              </strong>

            </div>


            <div
              class="module-actions"
            >

              <button
                class="small-btn"
                type="button"
                onclick="openResultModal('${module.id}')"
              >
                + Result
              </button>


              <button
                class="small-btn danger-btn"
                type="button"
                onclick="deleteModule('${module.id}')"
              >
                Delete
              </button>

            </div>


            ${
              moduleRecords.length
                ? `

                  <div
                    class="record-list"
                  >

                    ${moduleRecords
                      .map(
                        record => `

                        <div
                          class="record-card"
                        >

                          <span
                            class="record-badge"
                          >
                            ${escapeHTML(
                              (
                                record.record_type ||
                                "record"
                              )
                                .replaceAll(
                                  "_",
                                  " "
                                )
                            )}
                          </span>


                          <h3>
                            ${escapeHTML(
                              record.title ||
                              "Academic Record"
                            )}
                          </h3>


                          ${
                            record.mark !== null &&
                            record.mark !== undefined
                              ? `
                                <p>
                                  Mark:

                                  <strong>
                                    ${record.mark}

                                    ${
                                      record.max_mark
                                        ? ` / ${record.max_mark}`
                                        : ""
                                    }

                                  </strong>
                                </p>
                              `
                              : ""
                          }


                          ${
                            record.grade
                              ? `
                                <p>
                                  Grade:

                                  <strong>
                                    ${escapeHTML(
                                      record.grade
                                    )}
                                  </strong>
                                </p>
                              `
                              : ""
                          }


                          ${
                            record.record_date
                              ? `
                                <p>
                                  Date:
                                  ${escapeHTML(
                                    record.record_date
                                  )}
                                </p>
                              `
                              : ""
                          }


                          ${
                            record.notes
                              ? `
                                <p>
                                  ${escapeHTML(
                                    record.notes
                                  )}
                                </p>
                              `
                              : ""
                          }

                        </div>

                      `
                      )
                      .join("")}

                  </div>

                `
                : `

                  <p
                    class="module-meta"
                  >
                    No academic records saved
                    for this module yet.
                  </p>

                `
            }

          </article>

        `;

      })
      .join("");

}


/* =========================================================
   RESULT MODAL
========================================================= */

window.openResultModal =
  function(moduleId) {

    $("resultForm")
      ?.reset();


    if ($("resultModuleId")) {

      $("resultModuleId")
        .value =
        moduleId;

    }


    if ($("resultMaxMark")) {

      $("resultMaxMark")
        .value = 100;

    }


    message(
      "resultMessage",
      ""
    );


    $("resultModal")
      ?.classList
      .remove("hidden");

  };


/* =========================================================
   SAVE RESULT
========================================================= */

async function saveResult(event) {

  event.preventDefault();


  message(
    "resultMessage",
    ""
  );


  const moduleId =
    $("resultModuleId")
      .value;


  if (!moduleId) {

    message(
      "resultMessage",
      "Module is missing."
    );

    return;
  }


  const title =
    $("resultTitle")
      .value
      .trim();


  if (!title) {

    message(
      "resultMessage",
      "Enter a title for the result."
    );

    return;
  }


  const {
    error
  } =
    await db
      .from("academic_records")
      .insert({

        user_id:
          currentUser.id,

        module_id:
          moduleId,

        record_type:
          $("resultType")
            .value,

        title:

          title,

        mark:
          $("resultMark")
            .value
            ? Number(
                $("resultMark")
                  .value
              )
            : null,

        max_mark:
          $("resultMaxMark")
            .value
            ? Number(
                $("resultMaxMark")
                  .value
              )
            : null,

        grade:
          $("resultGrade")
            .value
            .trim(),

        record_date:
          $("resultDate")
            .value ||
          null,

        notes:
          $("resultNotes")
            .value
            .trim()

      });


  if (error) {

    message(
      "resultMessage",
      error.message
    );

    return;
  }


  closeModal(
    "resultModal"
  );


  await loadRecords();


  renderAll();


  toast(
    "Result saved successfully."
  );

}


/* =========================================================
   DELETE MODULE
========================================================= */

window.deleteModule =
  async function(moduleId) {


    if (
      !confirm(
        "Delete this module and its academic records?"
      )
    ) {

      return;

    }


    const {
      error
    } =
      await db
        .from("modules")
        .delete()
        .eq(
          "id",
          moduleId
        )
        .eq(
          "user_id",
          currentUser.id
        );


    if (error) {

      toast(
        error.message
      );

      return;

    }


    await loadModules();

    await loadRecords();


    renderAll();


    toast(
      "Module deleted."
    );

  };


/* =========================================================
   ASSIGNMENT MODAL
========================================================= */

function openAssignmentModal() {

  populateAssignmentModules();


  $("assignmentForm")
    ?.reset();


  if ($("assignmentMaxMark")) {

    $("assignmentMaxMark")
      .value = 100;

  }


  message(
    "assignmentMessage",
    ""
  );


  $("assignmentModal")
    ?.classList
    .remove("hidden");

}


/* =========================================================
   POPULATE ASSIGNMENT MODULES
========================================================= */

function populateAssignmentModules() {

  const select =
    $("assignmentModule");


  if (!select) return;


  if (!modules.length) {

    select.innerHTML = `
      <option value="">
        Add a module first
      </option>
    `;

    return;
  }


  select.innerHTML =
    modules
      .map(module => {

        const sem =
          semesters.find(
            s =>
              s.id ===
              module.semester_id
          );


        return `

          <option
            value="${module.id}"
          >

            ${escapeHTML(
              module.module_name
            )}

            —

            ${
              sem
                ? escapeHTML(
                    sem.label ||
                    `Year ${sem.academic_year} · Semester ${sem.semester}`
                  )
                : ""
            }

          </option>

        `;

      })
      .join("");

}


/* =========================================================
   SAVE ASSIGNMENT
========================================================= */

async function saveAssignment(event) {

  event.preventDefault();


  message(
    "assignmentMessage",
    ""
  );


  const moduleId =
    $("assignmentModule")
      .value;


  if (!moduleId) {

    message(
      "assignmentMessage",
      "Please add a module first."
    );

    return;
  }


  const title =
    $("assignmentTitle")
      .value
      .trim();


  if (!title) {

    message(
      "assignmentMessage",
      "Enter the assignment title."
    );

    return;
  }


  const {
    error
  } =
    await db
      .from("academic_records")
      .insert({

        user_id:
          currentUser.id,

        module_id:
          moduleId,

        record_type:
          "assignment",

        title:
          title,

        mark:
          $("assignmentMark")
            .value
            ? Number(
                $("assignmentMark")
                  .value
              )
            : null,

        max_mark:
          $("assignmentMaxMark")
            .value
            ? Number(
                $("assignmentMaxMark")
                  .value
              )
            : null,

        record_date:
          $("assignmentDate")
            .value ||
          null,

        notes:
          $("assignmentNotes")
            .value
            .trim()

      });


  if (error) {

    message(
      "assignmentMessage",
      error.message
    );

    return;
  }


  closeModal(
    "assignmentModal"
  );


  await loadRecords();


  renderAll();


  toast(
    "Assignment saved successfully."
  );

}


/* =========================================================
   RENDER ASSIGNMENTS
========================================================= */

function renderAssignments() {

  const container =
    $("assignmentsContainer");


  if (!container) return;


  const assignments =
    records.filter(
      record =>
        record.record_type ===
        "assignment"
    );


  if (!assignments.length) {

    container.innerHTML = `
      <div class="empty-state">
        No assignments recorded yet.
      </div>
    `;

    return;
  }


  container.innerHTML =
    assignments
      .map(record => {

        const module =
          getModule(
            record.module_id
          );


        const semester =
          module
            ? getModuleSemester(
                module.id
              )
            : null;


        return `

          <article
            class="record-card"
          >

            <span
              class="record-badge"
            >
              Assignment
            </span>


            <h3>
              ${escapeHTML(
                record.title ||
                "Assignment"
              )}
            </h3>


            <p>

              Module:

              <strong>
                ${escapeHTML(
                  module?.module_name ||
                  "Unknown module"
                )}
              </strong>

            </p>


            ${
              semester
                ? `
                  <p>

                    Semester:

                    <strong>
                      ${escapeHTML(
                        semester.label ||
                        `Year ${semester.academic_year} · Semester ${semester.semester}`
                      )}
                    </strong>

                  </p>
                `
                : ""
            }


            ${
              record.mark !== null &&
              record.mark !== undefined
                ? `
                  <p>

                    Mark:

                    <strong>

                      ${record.mark}

                      ${
                        record.max_mark
                          ? ` / ${record.max_mark}`
                          : ""
                      }

                    </strong>

                  </p>
                `
                : ""
            }


            ${
              record.record_date
                ? `
                  <p>

                    Date:

                    ${escapeHTML(
                      record.record_date
                    )}

                  </p>
                `
                : ""
            }


            ${
              record.notes
                ? `
                  <p>
                    ${escapeHTML(
                      record.notes
                    )}
                  </p>
                `
                : ""
            }

          </article>

        `;

      })
      .join("");

}


/* =========================================================
   PAYMENT MODAL
========================================================= */

function openPaymentModal() {

  $("paymentForm")
    ?.reset();


  if ($("paymentDate")) {

    $("paymentDate")
      .value =
      today();

  }


  message(
    "paymentMessage",
    ""
  );


  $("paymentModal")
    ?.classList
    .remove("hidden");

}


/* =========================================================
   SAVE PAYMENT
========================================================= */

async function savePayment(event) {

  event.preventDefault();


  message(
    "paymentMessage",
    ""
  );


  const year =
    Number(
      $("paymentYear")
        .value
    );


  const semester =
    Number(
      $("paymentSemester")
        .value
    );


  const semesterRow =
    getSemester(
      year,
      semester
    );


  if (!semesterRow) {

    message(
      "paymentMessage",
      "The selected semester could not be found."
    );

    return;
  }


  const amount =
    Number(
      $("paymentAmount")
        .value ||
      0
    );


  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    message(
      "paymentMessage",
      "Enter a valid payment amount."
    );

    return;
  }


  const {
    data: payment,
    error
  } =
    await db
      .from("payments")
      .insert({

        user_id:
          currentUser.id,

        semester_id:
          semesterRow.id,

        payment_type:
          $("paymentType")
            .value,

        amount:
          amount,

        currency:
          "MWK",

        payment_date:
          $("paymentDate")
            .value ||
          null,

        receipt_number:
          $("paymentReceipt")
            .value
            .trim(),

        payment_method:
          $("paymentMethod")
            .value
            .trim(),

        description:
          $("paymentDescription")
            .value
            .trim()

      })
      .select()
      .single();


  if (error) {

    message(
      "paymentMessage",
      error.message
    );

    return;
  }


  /* =======================================================
     UPLOAD RECEIPT
  ======================================================= */

  const file =
    $("paymentFile")
      ?.files
      ?.[0];


  if (file) {

    try {

      /* MAXIMUM 10 MB */

      const maxSize =
        10 * 1024 * 1024;


      if (
        file.size >
        maxSize
      ) {

        throw new Error(
          "Receipt file is larger than 10 MB."
        );

      }


      /* SAFE FILE NAME */

      const safeFileName =
        file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );


      const filePath =
        `${currentUser.id}/payments/${Date.now()}-${safeFileName}`;


      const {
        error:
          uploadError
      } =
        await db.storage
          .from(
            "academic-documents"
          )
          .upload(
            filePath,
            file,
            {
              upsert: false
            }
          );


      if (uploadError) {

        throw uploadError;

      }


      /* SAVE DOCUMENT INFORMATION */

      const {
        error:
          documentError
      } =
        await db
          .from("documents")
          .insert({

            user_id:
              currentUser.id,

            document_type:
              "receipt",

            title:
              $("paymentReceipt")
                .value
                .trim() ||
              $("paymentType")
                .value,

            file_name:
              file.name,

            file_path:
              filePath,

            file_size:
              file.size,

            mime_type:
              file.type,

            semester_id:
              semesterRow.id,

            payment_id:
              payment.id

          });


      if (documentError) {

        throw documentError;

      }


    } catch (uploadError) {

      console.error(
        "Receipt upload error:",
        uploadError
      );


      toast(
        "Payment saved, but receipt upload failed."
      );

    }

  }


  closeModal(
    "paymentModal"
  );


  await loadPayments();

  await loadDocuments();


  renderAll();


  toast(
    "Payment saved successfully."
  );

}


/* =========================================================
   RENDER PAYMENTS
========================================================= */

function renderPayments() {

  const container =
    $("paymentsContainer");


  if (!container) return;


  const total =
    payments.reduce(
      (
        sum,
        payment
      ) =>
        sum +
        Number(
          payment.amount ||
          0
        ),
      0
    );


  if ($("paymentTotal")) {

    $("paymentTotal")
      .textContent =
      money(total);

  }


  if (!payments.length) {

    container.innerHTML = `
      <div class="empty-state">
        No payments recorded yet.
      </div>
    `;

    return;
  }


  container.innerHTML =
    payments
      .map(payment => {

        const semester =
          semesters.find(
            s =>
              s.id ===
              payment.semester_id
          );


        return `

          <article
            class="record-card"
          >

            <span
              class="record-badge"
            >

              ${escapeHTML(
                (
                  payment.payment_type ||
                  "payment"
                ).replaceAll(
                  "_",
                  " "
                )
              )}

            </span>


            <h3>
              ${money(
                payment.amount
              )}
            </h3>


            ${
              semester
                ? `
                  <p>

                    Semester:

                    <strong>
                      ${escapeHTML(
                        semester.label ||
                        `Year ${semester.academic_year} · Semester ${semester.semester}`
                      )}
                    </strong>

                  </p>
                `
                : ""
            }


            ${
              payment.receipt_number
                ? `
                  <p>

                    Receipt:

                    <strong>
                      ${escapeHTML(
                        payment.receipt_number
                      )}
                    </strong>

                  </p>
                `
                : ""
            }


            ${
              payment.payment_date
                ? `
                  <p>

                    Date:

                    ${escapeHTML(
                      payment.payment_date
                    )}

                  </p>
                `
                : ""
            }


            ${
              payment.payment_method
                ? `
                  <p>

                    Method:

                    ${escapeHTML(
                      payment.payment_method
                    )}

                  </p>
                `
                : ""
            }


            ${
              payment.description
                ? `
                  <p>

                    ${escapeHTML(
                      payment.description
                    )}

                  </p>
                `
                : ""
            }

          </article>

        `;

      })
      .join("");

}


/* =========================================================
   DOCUMENT SIGNED URL
========================================================= */

async function getDocumentURL(path) {

  if (!path) return null;


  const {
    data,
    error
  } =
    await db.storage
      .from(
        "academic-documents"
      )
      .createSignedUrl(
        path,
        3600
      );


  if (error) {

    console.error(
      "Could not create signed URL:",
      error
    );

    return null;
  }


  return (
    data?.signedUrl ||
    null
  );

}


/* =========================================================
   RENDER DOCUMENTS
========================================================= */

async function renderDocuments() {

  const container =
    $("documentsContainer");


  if (!container) return;


  if (!documents.length) {

    container.innerHTML = `
      <div class="empty-state">
        No documents uploaded yet.
      </div>
    `;

    return;
  }


  container.innerHTML =
    documents
      .map(doc => `

        <article
          class="record-card"
        >

          <span
            class="record-badge"
          >

            ${escapeHTML(
              (
                doc.document_type ||
                "document"
              ).replaceAll(
                "_",
                " "
              )
            )}

          </span>


          <h3>

            ${escapeHTML(
              doc.title ||
              "Document"
            )}

          </h3>


          <p>

            ${escapeHTML(
              doc.file_name ||
              ""
            )}

          </p>


          ${
            doc.file_size
              ? `
                <small>
                  ${formatFileSize(
                    doc.file_size
                  )}
                </small>
              `
              : ""
          }


          <br>


          <button
            class="small-btn"
            type="button"
            onclick="openDocument('${doc.id}')"
          >
            Open Document
          </button>


        </article>

      `)
      .join("");

}


/* =========================================================
   FILE SIZE
========================================================= */

function formatFileSize(bytes) {

  const size =
    Number(bytes || 0);


  if (!size) return "";


  if (
    size <
    1024
  ) {

    return `${size} B`;

  }


  if (
    size <
    1024 * 1024
  ) {

    return `${(
      size / 1024
    ).toFixed(1)} KB`;

  }


  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} MB`;

}


/* =========================================================
   OPEN DOCUMENT
========================================================= */

window.openDocument =
  async function(documentId) {

    const doc =
      documents.find(
        item =>
          item.id ===
          documentId
      );


    if (!doc) {

      toast(
        "Document not found."
      );

      return;
    }


    const url =
      await getDocumentURL(
        doc.file_path
      );


    if (!url) {

      toast(
        "Could not open document."
      );

      return;
    }


    window.open(
      url,
      "_blank"
    );

  };


/* =========================================================
   PROFILE
========================================================= */

async function loadProfile() {

  if (!currentUser) return;


  const {
    data,
    error
  } =
    await db
      .from("profiles")
      .select("*")
      .eq(
        "id",
        currentUser.id
      )
      .maybeSingle();


  if (error) {

    console.error(
      "Loading profile failed:",
      error
    );

    return;
  }


  /* NO PROFILE YET */

  if (!data) {

    if ($("profileName")) {

      $("profileName")
        .value =
        currentUser
          ?.user_metadata
          ?.full_name ||
        "";

    }


    if ($("profileProgramme")) {

      $("profileProgramme")
        .value =
        "Bachelor of Applied Accounting, Auditing and Information Systems";

    }


    populateDashboard();

    return;
  }


  if ($("profileName")) {

    $("profileName")
      .value =
      data.full_name ||
      "";

  }


  if ($("profileStudentNumber")) {

    $("profileStudentNumber")
      .value =
      data.student_number ||
      "";

  }


  if ($("profileProgramme")) {

    $("profileProgramme")
      .value =
      data.programme ||
      "Bachelor of Applied Accounting, Auditing and Information Systems";

  }


  if ($("profileInstitution")) {

    $("profileInstitution")
      .value =
      data.institution ||
      "";

  }


  populateDashboard();

}


/* =========================================================
   SAVE PROFILE
========================================================= */

async function saveProfile(event) {

  event.preventDefault();


  message(
    "profileMessage",
    ""
  );


  const fullName =
    $("profileName")
      .value
      .trim();


  const studentNumber =
    $("profileStudentNumber")
      .value
      .trim();


  const programme =
    $("profileProgramme")
      .value
      .trim();


  const institution =
    $("profileInstitution")
      .value
      .trim();


  const {
    error
  } =
    await db
      .from("profiles")
      .upsert({

        id:
          currentUser.id,

        full_name:
          fullName,

        student_number:
          studentNumber,

        programme:
          programme,

        institution:
          institution,

        updated_at:
          new Date()
            .toISOString()

      });


  if (error) {

    message(
      "profileMessage",
      error.message
    );

    return;
  }


  if ($("welcomeName")) {

    $("welcomeName")
      .textContent =
      `Welcome, ${
        fullName ||
        "Student"
      }`;

  }


  message(
    "profileMessage",
    "Profile saved successfully.",
    true
  );


  toast(
    "Profile updated."
  );

}


/* =========================================================
   NAVIGATION
========================================================= */

function switchSection(
  sectionId
) {


  document
    .querySelectorAll(
      ".page-section"
    )
    .forEach(
      section => {

        section.classList
          .remove(
            "active-section"
          );

      }
    );


  $(sectionId)
    ?.classList
    .add(
      "active-section"
    );


  document
    .querySelectorAll(
      ".nav-btn"
    )
    .forEach(
      button => {

        button.classList
          .toggle(
            "active",
            button.dataset.section ===
            sectionId
          );

      }
    );


  /* DASHBOARD */

  if (
    sectionId ===
    "dashboardSection"
  ) {

    populateDashboard();

    renderSemesters();

  }


  /* RESULTS */

  if (
    sectionId ===
    "resultsSection"
  ) {

    renderModules();

  }


  /* ASSIGNMENTS */

  if (
    sectionId ===
    "assignmentsSection"
  ) {

    renderAssignments();

  }


  /* PAYMENTS */

  if (
    sectionId ===
    "paymentsSection"
  ) {

    renderPayments();

  }


  /* DOCUMENTS */

  if (
    sectionId ===
    "documentsSection"
  ) {

    renderDocuments();

  }

}


/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderAll() {

  populateDashboard();

  renderSemesters();

  renderModules();

  renderAssignments();

  renderPayments();

  renderDocuments();

  populateAssignmentModules();

}


/* =========================================================
   END
========================================================= */