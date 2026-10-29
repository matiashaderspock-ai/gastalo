async function setHomeMonth(page, month) {
  await page.locator("#app-menu > summary").click();
  await page.getByRole("button", { name: "Gráficos", exact: true }).click();
  await page.locator("#month").fill(month);
  await page.locator("#app-menu > summary").click();
  await page.getByRole("button", { name: "Inicio", exact: true }).click();
}
async function openMovementFromMenu(page) {
  await page.locator("#app-menu > summary").click();
  await page.getByRole("button", { name: "+ Movimiento", exact: true }).click();
}
module.exports = { setHomeMonth, openMovementFromMenu };
async function openDisclosure(page, selector) {
  const element = page.locator(selector);
  if (await element.count() && !await element.evaluate(e => e.open)) await element.locator(':scope > summary').click();
}
async function openRowActions(locator) {
  const row = locator.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " transaction ")][1]');
  const disclosure = row.locator('.transaction-actions');
  if (await disclosure.count() && !await disclosure.evaluate(e => e.open)) await disclosure.locator('summary').click();
}
module.exports.openDisclosure = openDisclosure;
module.exports.openRowActions = openRowActions;
