import { TuiRoot } from "@taiga-ui/core";
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeaderComponent } from './shared/components/app-header/app-header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppHeaderComponent, TuiRoot],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
}
