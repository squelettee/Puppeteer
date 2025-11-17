import express, { Request, Response } from 'express';
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

// Serveur Express avec Node.js
const app = express();
const PORT = process.env.PORT || 3001;

// Endpoint GET /project/:id
app.get('/project/:id', async (req: Request, res: Response) => {
  const projectId = req.params.id;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  const result = await getProjectDetails(projectId);

  return res.status(result.success ? 200 : 500).json(result);
});

// Route par défaut
app.get('/', (req: Request, res: Response) => {
  res.send('API Puppeteer - Use /project/:id');
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

