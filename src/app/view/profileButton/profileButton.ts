import {Component, inject, OnInit, signal} from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {ProfileMenuComponent} from '../map/profile-menu.component/profile-menu.component';
import {MatDialog} from '@angular/material/dialog';
import {Auth, authState} from '@angular/fire/auth';
import {Subscription} from 'rxjs';
import {doc, Firestore, getDoc} from '@angular/fire/firestore';
import {Router} from '@angular/router';

export interface UserData {
    fullName: string;
    email: string;
    profileImage: string;
}

@Component({
    selector: 'profile-button',
    standalone: true,
    imports: [CommonModule, MatIconModule, MatButtonModule, NgOptimizedImage],
    templateUrl: './profileButton.html',
    styleUrl: './profileButton.scss'
})

export class ProfileButtonComponent implements OnInit {

    userData = signal<UserData>({
        fullName: '',
        email: '',
        profileImage: 'assets/images/pfp.png'
    });

    private dialog = inject(MatDialog);
    private authSubscription: Subscription | null = null;
    private auth = inject(Auth);
    private firestore = inject(Firestore);
    private router = inject(Router);

    ngOnInit(): void {
        this.authSubscription = authState(this.auth).subscribe(async (user) => {
            if (user) {
                // El usuario existe, cargamos sus datos
                await this.loadUserData();
            } else {
                await this.router.navigate(['']);
            }
        });
    }

    private async loadUserData(): Promise<void> {
        const user = this.auth.currentUser;
        if (!user) return;

        try {
            const userDoc = doc(this.firestore, `users/${user.uid}`);
            const docSnap = await getDoc(userDoc);

            if (docSnap.exists()) {
                const data = docSnap.data();
                this.userData.set({
                    fullName: `${data['nombre'] || ''} ${data['apellidos'] || ''}`.trim(),
                    email: data['email'] || user.email || '',
                    profileImage: 'assets/images/pfp.png'
                });
            } else {
                this.userData.set({
                    fullName: '',
                    email: user.email || '',
                    profileImage: 'assets/images/pfp.png'
                });
            }
        } catch (error) {
            this.userData.set({
                fullName: '',
                email: user.email || '',
                profileImage: 'assets/images/pfp.png'
            });
        }
    }

    openProfileMenu(): void {
        this.dialog.open(ProfileMenuComponent, {
            backdropClass: 'transparent-backdrop',
            hasBackdrop: true,
            panelClass: 'profile-menu-dialog',

            position: {top: '16px', right: '16px'},

            maxWidth: 'none',
            enterAnimationDuration: '200ms',
            exitAnimationDuration: '200ms',
            data: this.userData()
        });
    }
}
