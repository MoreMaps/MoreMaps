import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('MoreMaps');
  constructor() {
    // Your web app's Firebase configuration
    // For Firebase JS SDK v7.20.0 and later, measurementId is optional
    const firebaseConfig = {
      apiKey: "AIzaSyB_Vc7r6kpjnEy7cRLYqCqiQa7pylMv6-E",
      authDomain: "ei1041-moremaps.firebaseapp.com",
      projectId: "ei1041-moremaps",
      storageBucket: "ei1041-moremaps.firebasestorage.app",
      messagingSenderId: "958769758011",
      appId: "1:958769758011:web:9d9d2f1fe7179e2f5f411e",
      measurementId: "G-GFWFZZB87Q"
    };
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
  }
}
