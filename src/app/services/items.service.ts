import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ItemsService {
  private firestore = inject(Firestore);

  getItems(): Observable<any[]> {
    const ref = collection(this.firestore, 'items');
    return collectionData(ref);
  }
}
