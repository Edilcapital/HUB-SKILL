import fetch from 'node-fetch';

/**
 * Traduce un singolo blocco di testo tramite Google Translate
 */
export async function translateText(text, targetLang = 'it') {
  if (!text || !text.trim()) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Translate API status: ${response.status}`);
    }
    const json = await response.json();
    if (json && json[0]) {
      return json[0].map(s => s[0]).join('');
    }
    return text;
  } catch (error) {
    console.error('Translation request failed:', error.message);
    return text;
  }
}

/**
 * Traduce un file markdown preservando blocchi di codice, frontmatter e righe vuote
 */
export async function translateMarkdown(markdown, targetLang = 'it') {
  if (!markdown) return '';
  const lines = markdown.split('\n');
  let isCodeBlock = false;
  let isFrontmatter = false;
  
  const textLinesToTranslate = [];
  const lineTypes = []; // 'code', 'frontmatter', 'empty', 'text'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Rileva frontmatter (tra i primi --- e i secondi ---)
    if (i === 0 && trimmed === '---') {
      isFrontmatter = true;
      lineTypes.push('frontmatter');
      continue;
    }
    if (isFrontmatter && trimmed === '---') {
      isFrontmatter = false;
      lineTypes.push('frontmatter');
      continue;
    }
    if (isFrontmatter) {
      lineTypes.push('frontmatter');
      continue;
    }

    // Rileva blocchi di codice (``` o ~~~)
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      isCodeBlock = !isCodeBlock;
      lineTypes.push('code');
      continue;
    }
    if (isCodeBlock) {
      lineTypes.push('code');
      continue;
    }

    // Rileva righe vuote, o separatori di tabelle
    if (!trimmed || (trimmed.startsWith('|') && trimmed.includes('---'))) {
      lineTypes.push('empty');
      continue;
    }

    // Altrimenti è testo normale
    lineTypes.push('text');
    textLinesToTranslate.push({ index: i, text: line });
  }

  // Raggruppa le righe in batch per minimizzare le chiamate HTTP (max 1500 caratteri per chiamata)
  const batches = [];
  let currentBatch = [];
  let currentLength = 0;

  for (const item of textLinesToTranslate) {
    if (currentLength + item.text.length > 1500 && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [];
      currentLength = 0;
    }
    currentBatch.push(item);
    currentLength += item.text.length + 1;
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  // Esegue le chiamate di traduzione per ciascun batch
  const translatedMap = {};
  for (const batch of batches) {
    const combinedText = batch.map(item => item.text).join('\n');
    try {
      const translatedCombined = await translateText(combinedText, targetLang);
      const translatedLines = translatedCombined.split('\n');
      
      // Se il numero di righe tradotte corrisponde, mappa 1:1
      if (translatedLines.length === batch.length) {
        batch.forEach((item, idx) => {
          translatedMap[item.index] = translatedLines[idx];
        });
      } else {
        // Altrimenti, fallback sicuro traducendo singolarmente le righe del batch
        for (const item of batch) {
          translatedMap[item.index] = await translateText(item.text, targetLang);
          await new Promise(resolve => setTimeout(resolve, 40));
        }
      }
    } catch (e) {
      // In caso di errore, mantiene l'originale
      batch.forEach(item => {
        translatedMap[item.index] = item.text;
      });
    }
    // Delay tra i batch per evitare ban/rate-limit
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  // Ricompone il file markdown finale
  const resultLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (lineTypes[i] === 'text' && translatedMap[i] !== undefined) {
      resultLines.push(translatedMap[i]);
    } else {
      resultLines.push(lines[i]);
    }
  }

  return resultLines.join('\n');
}

let bgTranslationRunning = false;

/**
 * Avvia il worker in background per tradurre le descrizioni delle skill nel database
 */
export function startBackgroundTranslation(db) {
  if (bgTranslationRunning) return;
  bgTranslationRunning = true;
  
  console.log('🏁 Background translation worker started.');
  
  async function run() {
    try {
      // Cerca le skill prive di traduzione italiana
      const untranslated = db.prepare("SELECT name, description FROM skills WHERE description_it IS NULL OR description_it = '' LIMIT 50").all();
      
      if (untranslated.length === 0) {
        // Nessuna skill da tradurre, ricontrolla tra 5 minuti
        setTimeout(run, 5 * 60 * 1000);
        return;
      }

      console.log(`ℹ️ Background translator: translating ${untranslated.length} descriptions...`);
      const updateStmt = db.prepare('UPDATE skills SET description_it = ? WHERE name = ?');

      for (const skill of untranslated) {
        if (!skill.description) {
          updateStmt.run('', skill.name);
          continue;
        }

        const translated = await translateText(skill.description, 'it');
        updateStmt.run(translated, skill.name);
        
        // Attendi 1.2 secondi per evitare rate-limiting da Google Translate
        await new Promise(resolve => setTimeout(resolve, 1200));
      }

      // Prossimo ciclo tra 3 secondi
      setTimeout(run, 3000);
    } catch (error) {
      console.error('❌ Background translator error:', error.message);
      // In caso di errore (es. 429 rate limit), attendi 2 minuti prima di riprendere
      setTimeout(run, 2 * 60 * 1000);
    }
  }

  run();
}
