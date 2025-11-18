import express, { Request, Response } from 'express';
import puppeteer from 'puppeteer';

async function getProjectDetails(projectId: string) {
  const browser = await puppeteer.launch({ headless: true });

  try {
    const page = await browser.newPage();

    await page.goto(`https://www.codeur.com/projects/${projectId}`, { waitUntil: 'networkidle2' });

    // Récupère le titre de l'offre
    const title = await page.$eval('h1.text-3xl', el => (el as HTMLElement).innerText.trim());

    // Récupère la description du projet
    const description = await page.$eval('.project-description.break-words .content', el => (el as HTMLElement).innerText.trim());

    // Récupère le budget indicatif
    const budget = await page.$eval('.project-details .flex.items-start span.font-semibold', el => (el as HTMLElement).innerText.trim());

    // Récupère les profils recherchés
    const profiles = await page.$$eval('.project-details .flex.items-start span.font-semibold a', els =>
      els.map(el => (el as HTMLElement).innerText.trim())
    );

    return {
      success: true,
      data: {
        projectId,
        title,
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

async function makeOffer(projectId: string, email: string, password: string, amount: number, duration: number, message: string) {
  const browser = await puppeteer.launch({ headless: true });

  try {
    const page = await browser.newPage();

    await page.goto(`https://www.codeur.com/projects/${projectId}`, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Clique sur "Se connecter"
    const signInLinkSelector = 'a[href="/users/sign_in"]';
    await page.waitForSelector(signInLinkSelector, { timeout: 5000 });
    await page.click(signInLinkSelector);
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Rempli l'email
    const emailSelector = 'input[name="user[email]"]';
    await page.waitForSelector(emailSelector, { timeout: 5000 });
    await page.type(emailSelector, email);

    // Rempli le mot de passe
    const passwordSelector = 'input[name="user[password]"]';
    await page.waitForSelector(passwordSelector, { timeout: 5000 });
    await page.type(passwordSelector, password);

    // Clique sur le bouton de connexion
    const submitLoginSelector = 'input[type="submit"][value="Se connecter"]';
    await page.waitForSelector(submitLoginSelector, { timeout: 5000 });
    await page.click(submitLoginSelector);
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Retourne sur la page du projet
    await page.goto(`https://www.codeur.com/projects/${projectId}`, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const offerButtonSelector = `a.btn.btn-primary[href="/projects/${projectId}/offers/new"]`;

    let success = false;
    try {
      await page.waitForSelector(offerButtonSelector, { timeout: 5000 });
      await page.click(offerButtonSelector);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const amountSelector = 'input[name="offer[amount]"]';
      await page.waitForSelector(amountSelector, { timeout: 5000 });
      await page.click(amountSelector);
      await page.type(amountSelector, amount.toString());

      const durationSelector = 'input[name="offer[duration]"]';
      await page.waitForSelector(durationSelector, { timeout: 5000 });
      await page.click(durationSelector);
      await page.type(durationSelector, duration.toString());

      const messageSelector = 'textarea[name="offer[comments_attributes][0][content]"]';
      await page.waitForSelector(messageSelector, { timeout: 5000 });
      await page.click(messageSelector);
      await page.type(messageSelector, message);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const submitSelector = 'input[type="submit"][value="Publier mon offre"]';
      await page.waitForSelector(submitSelector, { timeout: 5000 });
      await page.click(submitSelector);

      success = true;
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    return {
      success: true,
      message: success ? 'Offre publiée avec succès' : 'Erreur lors du processus'
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

// Middleware pour parser le JSON
app.use(express.json());

// Endpoint GET /project/:id
app.get('/project/:id', async (req: Request, res: Response) => {
  const projectId = req.params.id;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  const result = await getProjectDetails(projectId);

  return res.status(result.success ? 200 : 500).json(result);
});

// Endpoint POST /project/:id/make-offer
app.post('/project/:id/make-offer', async (req: Request, res: Response) => {
  const projectId = req.params.id;
  const { email, password, amount, duration, message } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  if (!email || !password || !amount || !duration || !message) {
    return res.status(400).json({ error: 'Email, password, amount, duration and message are required in the request body' });
  }

  const result = await makeOffer(projectId, email, password, amount, duration, message);

  return res.status(result.success ? 200 : 500).json(result);
});

// Route par défaut
app.get('/', (req: Request, res: Response) => {
  res.send('API Puppeteer - Use /project/:id or POST /project/:id/make-offer');
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

