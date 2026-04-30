/**
 * Immediately-Invoked Function Expression (IIFE) that generates and animates
 * floating icons in the background of the authentication section.
 * Creates an aesthetic, depth-of-field particle effect.
 */
(function spawnBooks() {
    const runSpawnBooks = () => {
        const layer = document.getElementById('booksLayer');
        if (!layer) return;
        layer.innerHTML = '';
        
        // Use a consistent count for a filled background
        const isMobile = window.innerWidth < 768;
        const TOTAL = isMobile ? 15 : 45; 
        
        const icons = [
            'fas fa-book', 
            'fas fa-book-open', 
            'fas fa-bookmark', 
            'fas fa-layer-group', 
            'fas fa-swatchbook'
        ];
        
        for (let i = 0; i < TOTAL; i++) {
            const book = document.createElement('div');
            book.classList.add('book');
            
            // Depth controls size, blur, and opacity for parallax look (even if static)
            const depth = Math.random(); 
            const size = 20 + (depth * 40); // 20px to 60px
            const blur = (1 - depth) * 4; // up to 4px blur
            const opacity = (0.15 + (depth * 0.45)).toFixed(2); // 0.15 to 0.60
            
            // Random static position across the entire screen
            const posX = Math.random() * 100; // 0vw to 100vw
            const posY = Math.random() * 100; // 0vh to 100vh
            const rotation = Math.random() * 360;
            
            // Base styling for the book element
            book.style.width = `${size}px`;
            book.style.height = `${size}px`;
            book.style.fontSize = `${size}px`;
            book.style.position = 'absolute';
            book.style.left = `${posX}vw`;
            book.style.top = `${posY}vh`;
            book.style.color = '#e0f2fe';
            book.style.opacity = opacity;
            book.style.transform = `rotate(${rotation}deg)`;
            
            // Apply filters for depth effect
            if (isMobile) {
                book.style.filter = `drop-shadow(0 0 4px rgba(255,255,255,0.2))`;
            } else {
                book.style.filter = `drop-shadow(0 0 ${6 + depth * 10}px rgba(255,255,255,${0.15 + depth * 0.3})) blur(${blur}px)`;
            }
            
            const ic = document.createElement('i');
            ic.className = icons[Math.floor(Math.random() * icons.length)];
            book.appendChild(ic);
            layer.appendChild(book);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(runSpawnBooks, 100));
    } else {
        setTimeout(runSpawnBooks, 100);
    }
})();

