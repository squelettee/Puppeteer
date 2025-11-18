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

async function makeOffer(projectId: string, email: string, password: string, amount: number, duration: number, message: string, prod: boolean = false) {
  const browser = await puppeteer.launch({
    headless: prod,
    defaultViewport: prod ? undefined : null,
    args: prod ? [] : ['--start-maximized']
  });

  try {
    const page = await browser.newPage();

    // Étape 1 : Va directement sur la page de connexion
    console.log('📍 Étape 1: Navigation vers la page de connexion');
    await page.goto('https://www.codeur.com/users/sign_in', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 200));

    // Étape 2 : Rempli l'email
    console.log('📍 Étape 2: Remplissage de l\'email');
    const emailSelector = 'input[name="user[email]"]';
    await page.waitForSelector(emailSelector, { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.type(emailSelector, email);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Étape 3 : Rempli le mot de passe
    console.log('📍 Étape 3: Remplissage du mot de passe');
    const passwordSelector = 'input[name="user[password]"]';
    await page.waitForSelector(passwordSelector, { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.type(passwordSelector, password);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Étape 4 : Clique sur le bouton de connexion
    console.log('📍 Étape 4: Clic sur le bouton de connexion');
    const submitLoginSelector = 'input[type="submit"][value="Se connecter"]';
    await page.waitForSelector(submitLoginSelector, { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.click(submitLoginSelector);
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('✅ Connexion réussie');

    await new Promise(resolve => setTimeout(resolve, 200));

    // Étape 5 : Va sur la page du projet
    console.log('📍 Étape 5: Navigation vers la page du projet');
    await page.goto(`https://www.codeur.com/projects/${projectId}`, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      await page.waitForSelector('a[data-remote="true"]', { timeout: 10000, visible: true });
      await new Promise(resolve => setTimeout(resolve, 500));

      await page.evaluate(() => {
        const button = document.querySelector('a[data-remote="true"]') as HTMLElement;
        if (button) {
          button.click();
        }
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.log('⚠️  Erreur lors du clic sur "Faire une offre"');
      throw error;
    }

    const amountSelector = 'input[name="offer[amount]"]';
    await page.waitForSelector(amountSelector, { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.click(amountSelector);
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.type(amountSelector, amount.toString());
    await new Promise(resolve => setTimeout(resolve, 200));

    const durationSelector = 'input[name="offer[duration]"]';
    await page.waitForSelector(durationSelector, { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.click(durationSelector);
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.type(durationSelector, duration.toString());
    await new Promise(resolve => setTimeout(resolve, 200));

    const messageSelector = 'textarea[name="offer[comments_attributes][0][content]"]';
    await page.waitForSelector(messageSelector, { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.click(messageSelector);
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.type(messageSelector, message);
    await new Promise(resolve => setTimeout(resolve, 200));

    const submitSelector = 'input[type="submit"][value="Publier mon offre"]';
    await page.waitForSelector(submitSelector, { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.click(submitSelector);
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('✅ Offre publiée avec succès !');
    await new Promise(resolve => setTimeout(resolve, 3000));

    return {
      success: true,
      message: 'Offre publiée avec succès'
    };
  } catch (error) {
    console.log('❌ Erreur:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    // En mode prod, on ferme le navigateur
    if (prod) {
      await browser.close();
    }
    // En mode dev, on laisse le navigateur ouvert pour inspection
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
  const { email, password, amount, duration, message, prod } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  if (!email || !password || !amount || !duration || !message) {
    return res.status(400).json({ error: 'Email, password, amount, duration and message are required in the request body' });
  }

  // prod est optionnel, par défaut false
  const isProd = prod === true;

  const result = await makeOffer(projectId, email, password, amount, duration, message, isProd);

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

