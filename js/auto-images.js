'use strict';
/* =============================================
   VELOUR - Auto Image Injector
   Replaces gradient placeholders with real
   fashion photos from picsum.photos (free, no key)
   ============================================= */

(function () {

  // Curated Picsum photo IDs that look great for fashion/clothing
  // Each entry: { id, hint } — id is the picsum photo ID
  const FASHION_IMAGES = {
    men: [
      { id: '1043', seed: 'man-shirt'    },
      { id: '1074', seed: 'man-suit'     },
      { id: '91',   seed: 'man-casual'   },
      { id: '1040', seed: 'man-jacket'   },
      { id: '1035', seed: 'man-jeans'    },
      { id: '1062', seed: 'man-coat'     },
    ],
    women: [
      { id: '1011', seed: 'woman-dress'  },
      { id: '1027', seed: 'woman-blouse' },
      { id: '1021', seed: 'woman-style'  },
      { id: '1052', seed: 'woman-coat'   },
      { id: '1012', seed: 'woman-skirt'  },
      { id: '1060', seed: 'woman-fashion'},
    ],
    kids: [
      { id: '1047', seed: 'kids-jacket'  },
      { id: '1049', seed: 'kids-dress'   },
      { id: '1076', seed: 'kids-hoodie'  },
      { id: '1080', seed: 'kids-wear'    },
    ],
    sale: [
      { id: '1055', seed: 'sale-shirt'   },
      { id: '1068', seed: 'sale-dress'   },
      { id: '1072', seed: 'sale-cap'     },
      { id: '1056', seed: 'sale-item'    },
    ],
    default: [
      { id: '999',  seed: 'fashion-1'    },
      { id: '996',  seed: 'fashion-2'    },
      { id: '993',  seed: 'fashion-3'    },
      { id: '990',  seed: 'fashion-4'    },
      { id: '987',  seed: 'fashion-5'    },
      { id: '984',  seed: 'fashion-6'    },
      { id: '981',  seed: 'fashion-7'    },
      { id: '978',  seed: 'fashion-8'    },
    ]
  };

  // Counters so each category rotates through different images
  const counters = { men: 0, women: 0, kids: 0, sale: 0, default: 0 };

  function getNextImage(category) {
    const pool = FASHION_IMAGES[category] || FASHION_IMAGES.default;
    const idx  = counters[category] % pool.length;
    counters[category]++;
    // Use picsum with a unique seed per product so images stay consistent on reload
    return `https://picsum.photos/seed/${pool[idx].seed}/400/520`;
  }

  // Shimmer loading style injected once
  function injectShimmerStyle() {
    if (document.getElementById('velour-shimmer-style')) return;
    const style = document.createElement('style');
    style.id = 'velour-shimmer-style';
    style.textContent = `
      .product-img-real {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: transform 0.4s ease, opacity 0.4s ease;
        opacity: 0;
      }
      .product-img-real.loaded { opacity: 1; }
      .product-card:hover .product-img-real { transform: scale(1.06); }

      .img-shimmer {
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.4s infinite;
      }
      @keyframes shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);
  }

  function replaceCard(card) {
    const placeholder = card.querySelector('.product-img-placeholder');
    if (!placeholder) return; // already has a real image

    const category = (card.dataset.category || 'default').replace('sale', 'sale');
    const imgUrl   = getNextImage(category);
    const imgWrap  = card.querySelector('.product-image');
    if (!imgWrap) return;

    // Make the image wrapper position:relative for shimmer overlay
    imgWrap.style.position = 'relative';

    // Add shimmer while loading
    const shimmer = document.createElement('div');
    shimmer.className = 'img-shimmer';
    imgWrap.insertBefore(shimmer, placeholder);

    // Create the real image
    const img = document.createElement('img');
    img.className = 'product-img-real';
    img.alt = card.querySelector('.product-name')?.textContent || 'Product';
    img.loading = 'lazy';

    img.onload = () => {
      img.classList.add('loaded');
      shimmer.remove();
      placeholder.remove();
    };

    img.onerror = () => {
      // Fallback: try a different picsum URL format
      img.onerror = () => {
        shimmer.remove();
        // Keep placeholder if both fail
      };
      img.src = `https://picsum.photos/400/520?random=${Math.floor(Math.random() * 900) + 100}`;
    };

    // Insert before placeholder, set src last to trigger load
    imgWrap.insertBefore(img, placeholder);
    img.src = imgUrl;
  }

  function injectAllImages() {
    injectShimmerStyle();

    // All product cards on the page
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(replaceCard);

    // Also observe for dynamically added cards (admin products injected later)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.classList?.contains('product-card')) {
            replaceCard(node);
          }
          node.querySelectorAll?.('.product-card').forEach(replaceCard);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectAllImages);
  } else {
    injectAllImages();
  }

})();
