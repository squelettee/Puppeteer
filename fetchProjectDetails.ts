import puppeteer from 'puppeteer';

async function getProjectDetails(projectId: string) {
  const browser = await puppeteer.launch({ headless: true });

  try {
    const page = await browser.newPage();

    await page.goto(`https://www.codeur.com/projects/${projectId}`, { waitUntil: 'networkidle2' });

    const description = await page.$eval('.project-description.break-words .content', el => (el as HTMLElement).innerText.trim());

    const budget = await page.$eval('.project-details .flex.items-start span.font-semibold', el => (el as HTMLElement).innerText.trim());

    const profiles = await page.$$eval('.project-details .flex.items-start span.font-semibold a', els =>
      els.map(el => (el as HTMLElement).innerText.trim())
    );

    return {
      success: true,
      data: {
        projectId,
        description,
        budget,
        profiles
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    await browser.close();
  }
}

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname.startsWith('/project/')) {
      const projectId = url.pathname.split('/project/')[1];

      if (!projectId) {
        return new Response(JSON.stringify({ error: 'Project ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await getProjectDetails(projectId);

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('API Puppeteer - Use /project/:id', { status: 404 });
  },
});

