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
        
        // Reduce count on mobile to improve performance
        const isMobile = window.innerWidth < 768;
        const TOTAL = isMobile ? 12 : 40; 
        
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
            
            // Depth controls size, blur, and opacity for parallax
            const depth = Math.random(); 
            const size = 20 + (depth * 40); // 20px to 60px
            const blur = (1 - depth) * 4; // up to 4px blur
            const opacity = (0.15 + (depth * 0.5)).toFixed(2); // 0.15 to 0.65
            
            // Random position across the entire screen
            const xPos = (Math.random() * 100).toFixed(1); // 0vw to 100vw
            const yPos = (Math.random() * 100).toFixed(1); // 0vh to 100vh
            
            // Random static rotation
            const rot = (Math.random() * 360).toFixed(1);
            
            // Base styling for the book element
            book.style.width = `${size}px`;
            book.style.height = `${size}px`;
            book.style.fontSize = `${size}px`;
            book.style.position = 'absolute';
            book.style.left = `${xPos}vw`;
            book.style.top = `${yPos}vh`;
            book.style.color = '#e0f2fe';
            book.style.opacity = opacity; // Maintain the depth-of-field opacity
            book.style.transform = `rotate(${rot}deg)`;
            
            // Simplify or remove expensive filters on mobile for buttery smooth performance
            if (isMobile) {
                book.style.filter = `drop-shadow(0 0 4px rgba(255,255,255,0.2))`;
            } else {
                book.style.filter = `drop-shadow(0 0 ${8 + depth * 12}px rgba(255,255,255,${0.2 + depth * 0.4})) blur(${blur}px)`;
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

