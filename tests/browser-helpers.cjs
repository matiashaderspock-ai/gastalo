async function setHomeMonth(page, month) {
  await page.locator("#app-menu > summary").click();
  await page.getByRole("button", { name: "Límites de categoría", exact: true }).click();
  await page.locator("#month").fill(month);
  await page.locator("#app-menu > summary").click();
  await page.getByRole("button", { name: "Inicio", exact: true }).click();
}
async function openMovementFromMenu(page) {
  await page.locator("#app-menu > summary").click();
  await page.getByRole("button", { name: "+ Movimiento", exact: true }).click();
}
module.exports = { setHomeMonth, openMovementFromMenu };
