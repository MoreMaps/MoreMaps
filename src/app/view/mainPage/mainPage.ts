import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {MatButton} from '@angular/material/button';
import {NgOptimizedImage} from '@angular/common';

@Component({
  selector: 'mainPage',
  templateUrl: './mainPage.html',
  imports: [
    MatButton,
    NgOptimizedImage,
  ],
  styleUrls: ['./mainPage.css']
})
export class MainPageComponent {

  constructor(private router: Router) {}

  /**
   * Navega a la página de inicio de sesión
   */
  onLogin(): void {
    console.log('Navegando a inicio de sesión');
    this.router.navigate(['/login']);
  }

  /**
   * Navega a la página de registro
   */
  onRegister(): void {
    console.log('Navegando a crear cuenta');
    this.router.navigate(['/register']);
  }
}
