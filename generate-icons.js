// generate-icons.js — Génère les icônes PWA 192x192 et 512x512
// Usage : node generate-icons.js
//
// Ce script crée des PNG SVG-based simples avec le logo H2M.
// Pour une production, remplacez public/icons/icon-192.png et icon-512.png
// par des vraies icônes créées dans Figma, Canva, ou similaire.

const fs = require('fs');
const path = require('path');

// PNG minimal valide (1x1 bleu H2M encodé en base64)
// Pour tester le fonctionnement PWA en attendant les vraies icônes
const PNG_1x1_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const iconsDir = path.join(__dirname, 'public', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

// Vérifier si canvas est disponible (pour de vraies icônes)
let canvas;
try {
  canvas = require('canvas');
} catch (e) {
  canvas = null;
}

if (canvas) {
  // Générer de vraies icônes avec canvas
  [192, 512].forEach((size) => {
    const c = canvas.createCanvas(size, size);
    const ctx = c.getContext('2d');

    // Fond bleu H2M
    ctx.fillStyle = '#1B4F8A';
    ctx.fillRect(0, 0, size, size);

    // Cercle blanc
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Texte H2M
    ctx.fillStyle = '#1B4F8A';
    ctx.font = 'bold ' + Math.round(size * 0.22) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H2M', size/2, size/2);

    const out = path.join(iconsDir, 'icon-' + size + '.png');
    fs.writeFileSync(out, c.toBuffer('image/png'));
    console.log('Créé : ' + out);
  });
} else {
  // Fallback : PNG minimal (à remplacer par de vraies icônes)
  console.log('Module canvas non disponible. Création de placeholders PNG...');
  console.log('Pour installer canvas : npm install canvas');
  console.log('Ou remplacez les fichiers manuellement avec vos icônes finales.');

  [192, 512].forEach((size) => {
    const out = path.join(iconsDir, 'icon-' + size + '.png');
    if (!fs.existsSync(out)) {
      fs.writeFileSync(out, Buffer.from(PNG_1x1_BASE64, 'base64'));
      console.log('Placeholder créé : ' + out + ' (remplacez par une vraie icône ' + size + 'x' + size + ')');
    } else {
      console.log('Existant (ignoré) : ' + out);
    }
  });
}

console.log('');
console.log('✅ Icônes prêtes dans public/icons/');
console.log('📌 Pour de vraies icônes : créez un PNG ' + 192 + 'x' + 192 + ' et ' + 512 + 'x' + 512 + ' avec votre logo.');
