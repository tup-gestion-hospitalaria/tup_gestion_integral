import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppToast } from './shared/app-toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppToast],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
