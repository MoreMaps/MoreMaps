import {Component, signal} from '@angular/core';
import {MainPageComponent} from './view/mainPage/mainPage';

@Component({
  selector: 'app-root',
  imports: [MainPageComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('MoreMaps');
}
