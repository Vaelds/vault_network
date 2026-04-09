document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#webform");
  const summary = document.querySelector("#summary-output");
  const peopleInput = document.querySelector("#people");
  const peopleValue = document.querySelector("#people-value");

  const defaultText = "Udfyld formularen og tryk på indsend for at se en opsummering her.";

  if (!form || !summary) return;

  const syncPeopleValue = () => {
    if (!peopleInput || !peopleValue) return;
    peopleValue.textContent = peopleInput.value;
  };

  syncPeopleValue();
  peopleInput?.addEventListener("input", syncPeopleValue);

  // SUBMIT
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = new FormData(form);

    const needs = data.getAll("needs");

    summary.innerHTML = `
      <strong>Navn:</strong> ${data.get("fullname") || ""}<br>
      <strong>Placering:</strong> ${data.get("location") || ""}<br>
      <strong>Antal personer:</strong> ${data.get("people") || ""}<br>
      <strong>Tilstand:</strong> ${data.get("status") || ""}<br>
      <strong>Området sikkert:</strong> ${data.get("safety") || ""}<br>
      <strong>Behov:</strong> ${needs.length ? needs.join(", ") : "Ingen angivet"}<br>
      <strong>Ekstra information:</strong> ${data.get("message") || "Ingen ekstra information"}
    `;
  });

  // RESET
  form.addEventListener("reset", () => {
    setTimeout(() => {
      summary.textContent = defaultText;
      syncPeopleValue();
    }, 0);
  });
});
