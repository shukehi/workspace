import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import puppeteer from 'puppeteer'

const ROOT = process.cwd()
const PORT = 4176

async function waitForDevServer(proc: ReturnType<typeof spawn>, timeoutMs = 60000) {
  const start = Date.now()
  let buffer = ''

  return await new Promise<void>((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      const text = chunk.toString()
      buffer += text
      if (buffer.includes('Local:') || buffer.includes('ready in')) {
        cleanup()
        resolve()
      } else if (Date.now() - start > timeoutMs) {
        cleanup()
        reject(new Error(`Vite dev server timeout. Output:\n${buffer}`))
      }
    }

    const onExit = (code: number | null) => {
      cleanup()
      reject(new Error(`Vite dev server exited early with code ${code}. Output:\n${buffer}`))
    }

    const cleanup = () => {
      proc.stdout!.off('data', onData)
      proc.stderr!.off('data', onData)
      proc.off('exit', onExit)
    }

    proc.stdout!.on('data', onData)
    proc.stderr!.on('data', onData)
    proc.on('exit', onExit)
  })
}

async function waitForHttp(url: string, timeoutMs = 60000) {
  const start = Date.now()

  while (Date.now() - start <= timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Retry until the frontend is actually accepting connections.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Timed out waiting for URL: ${url}`)
}

async function clickButtonByText(page: puppeteer.Page, text: string) {
  const clicked = await page.evaluate((targetText: string) => {
    const buttons = Array.from(document.querySelectorAll('button'))
    const target = buttons.find((btn) => (btn.textContent || '').includes(targetText))
    if (!target) return false
    target.click()
    return true
  }, text)

  assert.ok(clicked, `button not found: ${text}`)
}

async function readCreateDialogState(page: puppeteer.Page) {
  return await page.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'))
    const dialog = dialogs.find((node) => (node.textContent || '').includes('采购订单'))
    if (!dialog) {
      return null
    }

    const selects = Array.from(dialog.querySelectorAll('select'))
    const [templateSelect, categorySelect] = selects
    return {
      templateValue: templateSelect ? (templateSelect as HTMLSelectElement).value : null,
      categoryValue: categorySelect ? (categorySelect as HTMLSelectElement).value : null,
      categoryText: categorySelect
        ? (categorySelect as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() || ''
        : null,
      text: (dialog.textContent || '').replace(/\s+/g, ' ').trim(),
    }
  })
}

async function changeTemplate(page: puppeteer.Page, templateType: string) {
  const changed = await page.evaluate((nextTemplateType: string) => {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'))
    const dialog = dialogs.find((node) => (node.textContent || '').includes('采购订单'))
    if (!dialog) return false

    const templateSelect = dialog.querySelector('select')
    if (!(templateSelect instanceof HTMLSelectElement)) return false

    templateSelect.value = nextTemplateType
    templateSelect.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }, templateType)

  assert.ok(changed, `failed to change template to ${templateType}`)
}

test('procurement template entry e2e: merged templates require business category selection', async () => {
  const devServer = spawn('npm', ['run', 'dev:web', '--', '--host', '127.0.0.1', '--port', String(PORT)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  })

  let browser: puppeteer.Browser | undefined

  try {
    await waitForDevServer(devServer)
    await waitForHttp(`http://127.0.0.1:${PORT}/procurement`)

    browser = await puppeteer.launch({ headless: 'new' as unknown as boolean })
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 })
    page.on('dialog', async (dialog) => {
      await dialog.accept()
    })

    let createRequests = 0
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const url = req.url()
      const method = req.method()

      if (url.includes('/api/orders') && method === 'GET') {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
        return
      }

      if (url.includes('/api/orders') && method === 'POST') {
        createRequests += 1
        req.respond({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1 }),
        })
        return
      }

      if (url.includes('/api/inventory/locations')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
        return
      }

      req.continue()
    })

    await page.goto(`http://127.0.0.1:${PORT}/procurement`, { waitUntil: 'networkidle2' })
    await page.waitForSelector('text=采购管理')

    await clickButtonByText(page, '双开门配件')
    await page.waitForFunction(() => document.body.innerText.includes('手动录入颐家工贸'))

    const doubleDoorState = await readCreateDialogState(page)
    assert.ok(doubleDoorState)
    assert.equal(doubleDoorState.templateValue, 'double-door-accessory')
    assert.equal(doubleDoorState.categoryValue, '')
    assert.equal(doubleDoorState.categoryText, '请选择业务类别')

    await clickButtonByText(page, '创建采购单')
    await page.waitForFunction(() => document.body.innerText.includes('录入信息未通过校验'))
    await page.waitForFunction(() => document.body.innerText.includes('请选择业务类别'))
    assert.equal(createRequests, 0)

    await changeTemplate(page, 'general-accessory')
    await page.waitForFunction(() => {
      const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'))
      const dialog = dialogs.find((node) => (node.textContent || '').includes('采购订单'))
      if (!dialog) return false
      const templateSelect = dialog.querySelector('select')
      return templateSelect instanceof HTMLSelectElement && templateSelect.value === 'general-accessory'
    })

    const generalState = await readCreateDialogState(page)
    assert.ok(generalState)
    assert.equal(generalState.templateValue, 'general-accessory')
    assert.equal(generalState.categoryValue, '')
    assert.equal(generalState.categoryText, '请选择业务类别')

    await clickButtonByText(page, '创建采购单')
    await page.waitForFunction(() => document.body.innerText.includes('录入信息未通过校验'))
    await page.waitForFunction(() => document.body.innerText.includes('请选择业务类别'))
    assert.equal(createRequests, 0)

    await browser.close()
    browser = undefined
  } finally {
    if (browser) {
      await browser.close()
    }
    devServer.kill('SIGTERM')
  }
})
