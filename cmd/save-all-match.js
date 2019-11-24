const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

async function main() {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null
    });
    const page = await browser.newPage();

    // ページのループ
    for (let pageNum = 1; true; pageNum++) {
      const url = `http://www.ikz.jp/websb3/team.cgi?ikzhp=oss&page=${pageNum}&siaim=&mode_nendo=`;
      await page.goto(url, { waitUntil: "domcontentloaded" });

      const itemCount = (await page.$$('[value="詳細へ"]')).length;
      console.log(itemCount);
      if (itemCount === 0) {
        break;
      }

      // 詳細ボタンを順に押して試合結果詳細画面をループする
      for (let itemIndex = 0; itemIndex < itemCount; itemIndex++) {
        const button = (await page.$$('[value="詳細へ"]'))[itemIndex];
        await button.click();
        await page.waitForNavigation();

        const about = {
          試合日: await page.evaluate(
            () =>
              document.querySelector(
                "body > center > center:nth-child(3) > table:nth-child(1) > tbody > tr.grade > td:nth-child(2)"
              ).innerText
          ),
          グランド: await page.evaluate(
            () =>
              document.querySelector(
                "body > center > center:nth-child(3) > table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(2)"
              ).innerText
          ),
          先攻バッテリー: await page.evaluate(
            () =>
              document.querySelector(
                "body > center > center:nth-child(3) > table:nth-child(1) > tbody > tr:nth-child(7) > td:nth-child(2)"
              ).innerText
          ),
          後攻バッテリー: await page.evaluate(
            () =>
              document.querySelector(
                "body > center > center:nth-child(3) > table:nth-child(1) > tbody > tr:nth-child(8) > td:nth-child(2)"
              ).innerText
          ),
          長打: await page.evaluate(
            () =>
              document.querySelector(
                "body > center > center:nth-child(3) > table:nth-child(1) > tbody > tr:nth-child(9) > td:nth-child(2)"
              ).innerText
          ),
          内容: await page.evaluate(
            () =>
              document.querySelector(
                "body > center > center:nth-child(3) > table:nth-child(1) > tbody > tr:nth-child(10) > td:nth-child(2)"
              ).innerText
          )
        };

        const scores = await page.evaluate(() =>
          [...document.querySelectorAll('[bgcolor="green"]')]
            .splice(1)
            .map(row => {
              const tds = row.querySelectorAll("td");
              return {
                team: tds[0].innerText,
                totalPoint: tds[tds.length - 1].innerText,
                pointHistory: [...tds]
                  .splice(1, tds.length - 2)
                  .map(td => td.innerText)
              };
            })
        );

        const batter = await page.evaluate(() =>
          [
            ...document.querySelectorAll("table:nth-child(4) tr:not(.grade)")
          ].map(tr => {
            const td = [...tr.querySelectorAll("td")].map(td => td.innerText);
            return {
              order: td[0],
              pos: td[1],
              name: td[2],
              history: td.slice(3, -6),
              打点: td[15],
              盗塁: td[16],
              盗失: td[17],
              得点: td[18],
              失策: td[19],
              美技: td[20]
            };
          })
        );

        const pitcher = await page.evaluate(() =>
          [
            ...document.querySelectorAll("table:nth-child(6) tr:not(.grade)")
          ].map(tr => {
            const td = [...tr.querySelectorAll("td")].map(td => td.innerText);
            return {
              name: td[0],
              イニング数: td[1],
              自責点: td[2],
              失点: td[3],
              三振: td[4],
              四球: td[5],
              死球: td[6],
              被安: td[7],
              被本: td[8],
              投球数: td[9],
              暴投: td[10],
              勝敗: td[11]
            };
          })
        );

        const describe = {
          about,
          scores,
          batter,
          pitcher
        };

        const jsonStr = JSON.stringify(describe, null, 2);
        const baseDir = path.resolve(__dirname, "../data");
        const targetPath = path.join(baseDir, `${describe.about.試合日}.json`);
        try {
          await fs.promises.mkdir(baseDir);
        } catch {
          // nop
        }
        console.log(targetPath);
        await fs.promises.writeFile(targetPath, jsonStr, { encoding: "utf8" });

        await page.goBack(); // ページ戻る
        await page.waitFor(300);
      }

      // break;
    }

    browser.close();
  } catch (e) {
    if (browser) {
      browser.close();
    }
    console.warn(e);
    process.exit(1);
  }
}

main();
