/** Live EXO UI smoke. Never treats presence of controls as a successful CAD edit. */
import {chromium} from 'playwright-core'

const url=process.env.EXO_SMOKE_URL||'http://127.0.0.1:5174/?desktop=1&engine=clothcraft-lab&testSession=tee'
const browser=await chromium.launch({headless:true,executablePath:process.env.EXO_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const result={url,checks:[],errors:[]}
const check=(name,pass,detail='')=>result.checks.push({name,status:pass?'PASS':'FAIL',detail})
const page=await browser.newPage({viewport:{width:1720,height:1040},acceptDownloads:true})
page.on('pageerror',e=>result.errors.push(e.message))
try{
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000})
  await page.locator('body').waitFor()
  await page.waitForTimeout(4500)
  const text=await page.locator('body').innerText()
  const native=await page.locator('.cc-workspace').count()>0
  const shell=await page.locator('.app-shell').count()>0
  check('loaded application root',native||shell,`native=${native}; fullShell=${shell}`)
  check('2D viewport rendered',await page.locator('.cc-viewport-2d').count()>0)
  check('original E3 orientation locator',await page.locator('.cc-v2-board-orientation').count()>0,'Original contract timed out if this is absent')
  const initialBar=await page.locator('.cc-project-bar').innerText().catch(()=> '')
  check('Rust project snapshot loaded',/REV \d+.*\d+ PANELS/.test(initialBar),initialBar)
  const rustBridge='http://127.0.0.1:5193/workspace'
  const snapshot=async()=>{const response=await page.request.post(rustBridge,{data:{op:'snapshot'}});const json=await response.json();return json?.data}
  if(native){
    const select=page.getByRole('button',{name:/2D Grading Studio|Open full-screen 2D pattern studio/})
    const open=await select.count()>0
    check('2D grading studio control',open)
    if(open){await select.click();check('2D studio entered',await page.locator('.cc-pattern-studio-focus').count()>0);const exit=page.getByRole('button',{name:/Exit 2D Studio|Exit full-screen 2D pattern studio/});if(await exit.count())await exit.first().click()}
    const pattern=page.getByRole('button',{name:'Pattern',exact:true}).first()
    if(await pattern.count())await pattern.click()
    const before=await page.locator('.cc-project-bar').innerText()
    const beforePanels=Number(before.match(/(\d+) PANELS/)?.[1]??NaN)
    const create=page.getByRole('button',{name:'Create piece',exact:true})
    check('native pattern creation control',await create.count()>0,`beforePanels=${beforePanels}`)
    if(await create.count()&&await create.isEnabled()){
      await create.click()
      try{await page.waitForFunction(n=>Number(document.querySelector('.cc-project-bar')?.innerText.match(/(\d+) PANELS/)?.[1])===n+1,beforePanels,{timeout:6500})}catch{}
      const after=Number((await page.locator('.cc-project-bar').innerText()).match(/(\d+) PANELS/)?.[1]??NaN)
      check('create changed native panel inventory',after===beforePanels+1,`${beforePanels} -> ${after}`)
      if(after===beforePanels+1){
        const undo=page.locator('.cc-toolbar').getByRole('button',{name:'Undo'})
        const ready=await undo.isEnabled()
        check('native Undo enabled after edit',ready)
        if(ready){await undo.click();try{await page.waitForFunction(n=>Number(document.querySelector('.cc-project-bar')?.innerText.match(/(\d+) PANELS/)?.[1])===n,beforePanels,{timeout:6500})}catch{}
          const undone=Number((await page.locator('.cc-project-bar').innerText()).match(/(\d+) PANELS/)?.[1]??NaN)
          check('Undo restores original panel inventory',undone===beforePanels,`${undone} vs ${beforePanels}`)
          const redo=page.locator('.cc-toolbar').getByRole('button',{name:'Redo'})
          if(await redo.count()&&await redo.isEnabled()){
            await redo.click()
            await page.waitForTimeout(400)
            const redone=Number((await page.locator('.cc-project-bar').innerText()).match(/(\d+) PANELS/)?.[1]??NaN)
            check('Redo restores created panel',redone===beforePanels+1,`${redone} vs ${beforePanels+1}`)
            if(redone===beforePanels+1){
              const save=page.getByRole('button',{name:'Save',exact:true})
              if(await save.count()&&await save.isEnabled()){
                await save.click()
                await page.waitForTimeout(400)
                await page.reload({waitUntil:'domcontentloaded'})
                await page.waitForTimeout(1200)
                const reopened=Number((await page.locator('.cc-project-bar').innerText()).match(/(\d+) PANELS/)?.[1]??NaN)
                check('Save and reload preserves created panel',reopened===beforePanels+1,`${reopened} vs ${beforePanels+1}`)
              }else check('Save and reload preserves created panel',false,'Save unavailable')
            }
          }else check('Redo restores created panel',false,'Redo unavailable')
        }
      }
    }else check('create changed native panel inventory',false,'Control disabled or absent')
    const beforeGrade=await snapshot()
    const target=beforeGrade?.template?.panels?.at(-1)
    const geometry=panel=>JSON.stringify({polygon:panel?.polygon,pattern:panel?.pattern,points:panel?.points,vertices:panel?.vertices,boundary:panel?.boundary,curves:panel?.curves,outline:panel?.outline})
    const gradeEntry=page.getByRole('button',{name:/2D Grading Studio|Open full-screen 2D pattern studio/})
    if(await gradeEntry.count())await gradeEntry.first().click()
    const gradeTrigger=page.getByRole('button',{name:'Grading & size rules'})
    if(await gradeTrigger.count())await gradeTrigger.first().click()
    const gradePanel=page.locator('[data-native-grade-pattern="true"]')
    const gradeVisible=await gradePanel.isVisible().catch(()=>false)
    check('numeric grading dialog opened',gradeVisible)
    if(gradeVisible&&target){
      await gradePanel.getByRole('tab',{name:'Resize'}).click()
      const choices=gradePanel.getByRole('combobox',{name:'Pattern to grade'})
      if(await choices.count())await choices.selectOption(target.id)
      await gradePanel.getByRole('spinbutton',{name:'Grade width delta millimetres'}).fill('17')
      await gradePanel.getByRole('spinbutton',{name:'Grade height delta millimetres'}).fill('9')
      const apply=gradePanel.locator('[data-native-grade-apply="true"]')
      const enabled=await apply.isEnabled()
      check('numeric grading accepted by UI',enabled,`panel=${target.id}`)
      if(enabled){
        await apply.click()
        await page.waitForTimeout(700)
        const afterGrade=await snapshot()
        const updated=afterGrade?.template?.panels?.find(p=>p.id===target.id)
        const changed=Boolean(updated)&&geometry(target)!==geometry(updated)&&afterGrade.revision>beforeGrade.revision
        check('Rust returned actual numeric graded geometry',changed,`revision ${beforeGrade.revision}->${afterGrade?.revision}; geometryChanged=${geometry(target)!==geometry(updated)}`)
        if(changed){
          const undoGrade=page.locator('.cc-toolbar').getByRole('button',{name:'Undo'})
          await undoGrade.click()
          await page.waitForTimeout(450)
          const restored=(await snapshot())?.template?.panels?.find(p=>p.id===target.id)
          check('numeric grading Undo restores Rust contour',geometry(restored)===geometry(target))
          const redoGrade=page.locator('.cc-toolbar').getByRole('button',{name:'Redo'})
          await redoGrade.click()
          await page.waitForTimeout(450)
          const redone=(await snapshot())?.template?.panels?.find(p=>p.id===target.id)
          check('numeric grading Redo restores Rust graded contour',geometry(redone)===geometry(updated))
        }
      }
    }
    const closeStudio=page.getByRole('button',{name:/Exit 2D Studio|Exit full-screen 2D pattern studio/})
    if(await closeStudio.count())await closeStudio.first().click()
    const exported=page.getByRole('button',{name:'Save / export',exact:true})
    if(await exported.count()&&await exported.isEnabled()){
      const [download]=await Promise.all([page.waitForEvent('download',{timeout:12000}),exported.click()])
      const stream=await download.createReadStream()
      let data='';for await(const chunk of stream)data+=chunk.toString('utf8')
      let doc;try{doc=JSON.parse(data)}catch{}
      check('browser Save/export yields valid editable garment JSON',Boolean(doc?.template?.panels?.length)&&doc.template.panels.length===(await snapshot())?.template?.panels?.length,`filename=${download.suggestedFilename()}; panels=${doc?.template?.panels?.length}`)
    }else check('browser Save/export yields valid editable garment JSON',false,'Export action unavailable')
    await page.reload({waitUntil:'domcontentloaded'})
    await page.waitForTimeout(2500)
    check('application reopens after edit/undo',await page.locator('.cc-workspace').count()>0,'Native session persistence not proven by reload')
  }else{
    check('create changed native panel inventory',false,'Full EXO shell served; native editing route unavailable')
    check('Undo restores original panel inventory',false,'Native edit not attempted')
    check('application reopens after edit/undo',false,'Native edit not attempted')
  }
  check('no uncaught page errors',result.errors.length===0,result.errors.slice(0,4).join('; '))
}catch(error){result.errors.push(String(error.message||error))}
finally{await browser.close()}
result.pass=result.errors.length===0&&result.checks.every(c=>c.status==='PASS')
console.log(JSON.stringify(result,null,2))
if(!result.pass)process.exitCode=1
