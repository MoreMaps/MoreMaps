import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'dev-theme-toggle',
    standalone: true,
    imports: [CommonModule, MatIconModule, MatButtonModule],
    templateUrl: './themeToggle.html',
    styleUrl: './themeToggle.css'
})
export class ThemeToggleComponent implements OnInit {
    private platformId = inject(PLATFORM_ID);
    isDarkMode = false;

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            // Check if user has a saved preference
            const savedTheme = localStorage.getItem('theme');

            if (savedTheme) {
                this.isDarkMode = savedTheme === 'dark';
            } else {
                // Check system preference
                this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            }

            this.applyTheme();
        }
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.applyTheme();

        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
        }
    }

    private applyTheme() {
        if (isPlatformBrowser(this.platformId)) {
            const body = document.body;

            if (this.isDarkMode) {
                body.classList.add('dark-theme');
            } else {
                body.classList.remove('dark-theme');
            }
        }
    }
}
