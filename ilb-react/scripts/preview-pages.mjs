import { PDFDocument } from 'pdf-lib'
import { readFile, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const SRC = '/Users/angietatianapena/ILB-FRONTEND/ilb-react/public/documents/Manual-Admin-La-Industria-Bolera.pdf'
const pages = process.argv.slice(2).map(n => parseInt(n, 10)).filter(Number.isFinite)

const data = await readFile(SRC)
for (const n of pages) {
  const src = await PDFDocument.load(data)
  const dst = await PDFDocument.create()
  const [copied] = await dst.copyPages(src, [n - 1])
  dst.addPage(copied)
  const bytes = await dst.save()
  const tmp = `/tmp/page_${n}.pdf`
  await writeFile(tmp, bytes)
  await exec('sips', ['-s', 'format', 'jpeg', '--resampleHeightWidthMax', '1000', '-o', `/tmp/manual_view_p${n}.jpg`, tmp])
  console.log('wrote /tmp/manual_view_p' + n + '.jpg')
}
