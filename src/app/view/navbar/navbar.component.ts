import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-navbar',
    imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.css'
})
export class NavbarComponent {
    private router = inject(Router);

    isActive(route: string): boolean {
        return this.router.url === route;
    }

    navigateTo(route: string): void {
        this.router.navigate([route]);
    }

    openAddDialog(): void {
        // TODO: Implementar diálogo para búsqueda
        console.log('Abrir diálogo de búsqueda');
    }
}
