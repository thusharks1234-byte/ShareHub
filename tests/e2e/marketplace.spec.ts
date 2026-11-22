import { expect, test } from '@playwright/test'

const widths = [360, 390, 430, 768, 1024, 1280, 1440, 1920]

test.describe('public marketplace responsive layouts', () => {
  for (const width of widths) {
    test(`homepage fits ${width}px viewport`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      const runtimeErrors: string[] = []
      if (width === 390) {
        page.on('pageerror', (error) => runtimeErrors.push(error.message))
        page.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()) })
      }
      await page.goto('/')
      await expect(page.getByRole('heading', { name: 'Borrow less. Share more.' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Browse by category' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Recently listed nearby' })).toBeVisible()
      await expect(page.getByRole('button', { name: /electronics & gadgets/i }).first()).toBeVisible()
      await expect(page.getByRole('heading', { name: 'No products available yet.' })).toBeVisible()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      await expect(page.locator('nav[aria-label="Mobile bottom navigation"]')).toHaveCSS('display', width < 768 ? 'grid' : 'none')

      if (width === 390 || width === 1440) {
        await page.screenshot({ path: testInfo.outputPath(`homepage-${width}.png`), fullPage: true })
      }
      if (width === 390) expect(runtimeErrors).toEqual([])
    })
  }
})

test('mobile filter sheet opens, remains within the viewport, and closes', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('button', { name: /electronics & gadgets/i }).first()).toBeVisible()
  await page.getByRole('link', { name: 'Explore', exact: true }).click()
  await expect(page).toHaveURL(/#listings$/)
  const openFilters = page.getByRole('button', { name: /filter & sort/i })
  await expect(openFilters).toBeVisible()
  await openFilters.click()
  const dialog = page.getByRole('dialog', { name: /filters & sorting/i })
  await expect(dialog).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('mobile-filter-sheet.png'), fullPage: false })
  await dialog.getByRole('button', { name: /close/i }).click()
  await expect(dialog).toHaveCount(0)
})

test('search, category selection, sorting, and rent filters query the live marketplace', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('button', { name: /electronics & gadgets/i }).first()).toBeVisible()
  await page.getByRole('textbox', { name: 'Search products' }).fill('camera')
  await page.getByRole('textbox', { name: 'City or locality' }).fill('Bengaluru')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Results for “camera”' })).toBeVisible()
  await expect(page.getByText('No products match those filters')).toBeVisible()

  await page.getByRole('button', { name: /electronics & gadgets/i }).first().click()
  await expect(page.getByRole('heading', { name: 'Electronics & Gadgets', exact: true })).toBeVisible()
  await page.getByRole('button', { name: /filter & sort/i }).click()
  const dialog = page.getByRole('dialog', { name: /filters & sorting/i })
  await expect(dialog.getByLabel('Sort listings')).toHaveValue('newest')
  await dialog.getByLabel('Sort listings').selectOption('rent-desc')
  await expect(dialog.getByLabel('Sort listings')).toHaveValue('rent-desc')
  await dialog.getByLabel('Min', { exact: false }).fill('1')
  await dialog.getByRole('button', { name: /show .* items/i }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('No products match those filters')).toBeVisible()
})

test('authentication and public detail routes render without a session', async ({ page }, testInfo) => {
  const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password']
  for (const [device, width, height] of [['mobile', 390, 844], ['desktop', 1440, 1000]] as const) {
    await page.setViewportSize({ width, height })
    for (const route of authRoutes) {
      await page.goto(route)
      await expect(page.getByRole('main')).toBeVisible()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`${route.slice(1)}-${device}.png`), fullPage: true })
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Log in to ShareHub' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('login-desktop.png'), fullPage: true })

  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByText('Enter a valid email address.')).toBeVisible()

  await page.goto('/listings/00000000-0000-4000-8000-000000000000')
  await expect(page.getByRole('heading', { name: 'This listing is unavailable' })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('unavailable-listing-mobile.png'), fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/listings/00000000-0000-4000-8000-000000000000')
  await expect(page.getByRole('heading', { name: 'This listing is unavailable' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('unavailable-listing-desktop.png'), fullPage: true })

  const unknownProfile = '/profiles/00000000-0000-4000-8000-000000000000'
  for (const [device, width, height] of [['mobile', 390, 844], ['desktop', 1440, 1000]] as const) {
    await page.setViewportSize({ width, height })
    await page.goto(unknownProfile)
    await expect(page.getByRole('heading', { name: 'Profile not found' })).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`public-profile-${device}.png`), fullPage: true })
  }
})

test('private routes return unauthenticated users to login', async ({ page }) => {
  for (const route of [
    '/dashboard',
    '/profile',
    '/inbox',
    '/inbox/00000000-0000-4000-8000-000000000000',
    '/my-listings',
    '/listings/new',
    '/my-listings/00000000-0000-4000-8000-000000000000/edit',
  ]) {
    await page.goto(route)
    await expect(page).toHaveURL(/\/login$/)
  }
})

test('invalid routes show a useful not-found page and home navigation works', async ({ page }) => {
  await page.goto('/this-route-does-not-exist')
  await expect(page.getByRole('heading', { name: 'We couldn’t find that page' })).toBeVisible()
  await page.getByRole('link', { name: /back to sharehub/i }).click()
  await expect(page).toHaveURL(/\/$/)
})
