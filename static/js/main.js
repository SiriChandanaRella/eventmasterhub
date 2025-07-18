// Main JavaScript file for EventMasterHub

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    var popoverList = popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Form validation
    const forms = document.querySelectorAll('.needs-validation');
    Array.prototype.slice.call(forms).forEach(function(form) {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });

    // Auto-dismiss alerts
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(function(alert) {
        if (alert.classList.contains('alert-success')) {
            setTimeout(function() {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }, 5000);
        }
    });

    // Search functionality
    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            // Auto-submit search form after user stops typing
            const form = this.closest('form');
            if (form) {
                form.submit();
            }
        }, 500));
    }

    // Copy to clipboard functionality
    window.copyToClipboard = function(text) {
        navigator.clipboard.writeText(text).then(function() {
            showNotification('Link copied to clipboard!', 'success');
        }).catch(function(err) {
            console.error('Failed to copy: ', err);
            showNotification('Failed to copy link', 'error');
        });
    };

    // Show notification
    window.showNotification = function(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show notification`;
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(function() {
            notification.remove();
        }, 5000);
    };

    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Loading states for forms
    const submitButtons = document.querySelectorAll('button[type="submit"]');
    submitButtons.forEach(button => {
        button.addEventListener('click', function() {
            const form = this.closest('form');
            if (form && form.checkValidity()) {
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
                this.classList.add('loading');
            }
        });
    });

    // Preview image before upload
    const imageInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
    imageInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    let preview = document.getElementById('imagePreview');
                    if (!preview) {
                        preview = document.createElement('img');
                        preview.id = 'imagePreview';
                        preview.className = 'img-fluid mt-2';
                        preview.style.maxHeight = '200px';
                        input.parentNode.appendChild(preview);
                    }
                    preview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    });

    // Dynamic time display
    const timeElements = document.querySelectorAll('.time-display');
    timeElements.forEach(element => {
        const timestamp = element.getAttribute('data-timestamp');
        if (timestamp) {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            
            if (diff < 60000) { // Less than 1 minute
                element.textContent = 'just now';
            } else if (diff < 3600000) { // Less than 1 hour
                const minutes = Math.floor(diff / 60000);
                element.textContent = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            } else if (diff < 86400000) { // Less than 1 day
                const hours = Math.floor(diff / 3600000);
                element.textContent = `${hours} hour${hours > 1 ? 's' : ''} ago`;
            } else {
                element.textContent = date.toLocaleDateString();
            }
        }
    });

    // Dark mode toggle (if needed)
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-bs-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-bs-theme', savedTheme);
    }

    // Lazy loading for images
    const lazyImages = document.querySelectorAll('img[data-src]');
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });

        lazyImages.forEach(img => imageObserver.observe(img));
    }

    // Print functionality
    window.printPage = function() {
        window.print();
    };

    // Share functionality
    window.shareEvent = function(title, url) {
        if (navigator.share) {
            navigator.share({
                title: title,
                url: url
            });
        } else {
            copyToClipboard(url);
        }
    };

    // Back to top button
    const backToTopButton = document.createElement('button');
    backToTopButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
    backToTopButton.className = 'btn btn-primary position-fixed bottom-0 end-0 m-3 rounded-circle';
    backToTopButton.style.display = 'none';
    backToTopButton.style.zIndex = '1000';
    backToTopButton.onclick = function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    document.body.appendChild(backToTopButton);

    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            backToTopButton.style.display = 'block';
        } else {
            backToTopButton.style.display = 'none';
        }
    });
});
