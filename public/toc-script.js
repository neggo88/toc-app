document.addEventListener('DOMContentLoaded', () => {
    // Prüfe, ob die Seite ein Blogartikel ist
    const isBlogArticle = document.querySelector('.article-template');
    if (!isBlogArticle) return;

    // Finde den Inhaltscontainer
    const articleContent = document.querySelector('.article-template__content');
    if (!articleContent) return;

    // Finde alle Überschriften im Inhaltscontainer (h1, h2, h3)
    const headings = articleContent.querySelectorAll('h1, h2, h3');
    if (headings.length === 0) return;

    // Erstelle das Inhaltsverzeichnis-Container
    const toc = document.createElement('div');
    toc.className = 'toc';
    toc.innerHTML = `
        <div class="toc-header">
            <h3>Inhaltsverzeichnis</h3>
            <span class="toc-toggle">[anzeigen]</span>
        </div>
        <ul class="toc-list"></ul>
    `;

    // Füge jede Überschrift als Link zum Inhaltsverzeichnis hinzu
    headings.forEach(heading => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.textContent = heading.textContent;
        a.href = `#${heading.id || heading.textContent.replace(/\s+/g, '-').toLowerCase()}`;
        heading.id = heading.id || a.href.split('#')[1];
        li.appendChild(a);
        toc.querySelector('.toc-list').appendChild(li);
    });

    // Füge das ToC am Anfang des Inhaltscontainers ein
    articleContent.prepend(toc);

    // Zeige das ToC nur, wenn es Einträge gibt
    if (toc.querySelector('.toc-list').children.length > 0) {
        toc.style.display = 'block';
    } else {
        toc.style.display = 'none';
        return;
    }

    // Ausklappfunktion
    const tocList = toc.querySelector('.toc-list');
    const toggleLink = toc.querySelector('.toc-toggle');

    toggleLink.addEventListener('click', () => {
        if (tocList.style.display === 'none' || tocList.style.display === '') {
            tocList.style.display = 'block';
            toggleLink.textContent = '[verbergen]';
        } else {
            tocList.style.display = 'none';
            toggleLink.textContent = '[anzeigen]';
        }
    });
});