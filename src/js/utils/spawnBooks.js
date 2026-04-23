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
            
            // Random start position just below the screen
            const startX = -10 + Math.random() * 120; // -10vw to 110vw
            const startY = 110 + Math.random() * 20; // 110vh to 130vh
            
            // Float upwards and slightly sideways past the top
            const endX = startX + (-40 + Math.random() * 80); 
            const endY = -20 - Math.random() * 20; // -20vh to -40vh
            
            // Travel duration 20s to 50s (slower is more premium)
            const dur = (20 + (1 - depth) * 15 + Math.random() * 15).toFixed(1); 
            const delay = (-Math.random() * dur).toFixed(1);
            
            // Rotation
            const rotS = (Math.random() * 360).toFixed(1);
            const rotDirection = Math.random() > 0.5 ? 1 : -1;
            const rotE = (parseFloat(rotS) + rotDirection * (90 + Math.random() * 180)).toFixed(1);
            
            // Base styling for the book element
            book.style.width = `${size}px`;
            book.style.height = `${size}px`;
            book.style.fontSize = `${size}px`;
            book.style.position = 'absolute';
            book.style.left = `${startX}vw`;
            book.style.top = `${startY}vh`;
            book.style.color = '#e0f2fe';
            
            // Simplify or remove expensive filters on mobile for buttery smooth 60fps
            if (isMobile) {
                book.style.filter = `drop-shadow(0 0 4px rgba(255,255,255,0.2))`;
            } else {
                book.style.filter = `drop-shadow(0 0 ${8 + depth * 12}px rgba(255,255,255,${0.2 + depth * 0.4})) blur(${blur}px)`;
            }
            
            const ic = document.createElement('i');
            ic.className = icons[Math.floor(Math.random() * icons.length)];
            book.appendChild(ic);
            layer.appendChild(book);

            // GSAP Animation
            gsap.fromTo(book, 
                { 
                    x: 0, 
                    y: 0, 
                    rotation: rotS, 
                    opacity: 0,
                    scale: 0.8
                },
                {
                    x: `${endX - startX}vw`, 
                    y: `${endY - startY}vh`, 
                    rotation: rotE, 
                    opacity: opacity,
                    scale: 1,
                    duration: dur, 
                    delay: delay > 0 ? delay : 0, // Delay shouldn't be negative in this context for fromTo, we just let them start at different times or apply negative delay with GSAP correctly
                    ease: "none", 
                    repeat: -1,
                    yoyo: false,
                    onStart: function() {
                        // Fade in nicely at start
                        gsap.to(book, {opacity: opacity, duration: 2, ease: "power1.inOut"});
                    },
                    onRepeat: function() {
                        // Fade in smoothly on repeat
                        gsap.fromTo(book, {opacity: 0}, {opacity: opacity, duration: 2, ease: "power1.inOut"});
                    }
                }
            );
            
            // Apply negative delay by adjusting the playhead
            if (delay < 0) {
                gsap.getTweensOf(book).forEach(t => t.progress(Math.abs(delay) / dur));
            }
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(runSpawnBooks, 100));
    } else {
        setTimeout(runSpawnBooks, 100);
    }
})();

