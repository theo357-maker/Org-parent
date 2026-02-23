// ============================================
// GESTIONNAIRE DE STOCKAGE DES NOTIFICATIONS
// ÉVITE LES DUPLICATIONS ET GÈRE L'EXPIRATION
// ============================================

class NotificationStore {
  constructor() {
    this.STORAGE_KEY = 'parent_notifications_v2';
    this.EXPIRY_DAYS = 5; // 5 jours avant suppression
    this.notifications = [];
    this.load();
  }

  // Charger les notifications depuis localStorage
  load() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.notifications = JSON.parse(saved);
        this.cleanExpired(); // Nettoyer les expirées au chargement
      } else {
        this.notifications = [];
      }
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
      this.notifications = [];
    }
  }

  // Sauvegarder dans localStorage
  save() {
    try {
      // Garder seulement les 100 dernières notifications
      if (this.notifications.length > 100) {
        this.notifications = this.notifications.slice(0, 100);
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Erreur sauvegarde notifications:', error);
    }
  }

  // Nettoyer les notifications expirées (plus de 5 jours)
  cleanExpired() {
    const now = Date.now();
    const expiryTime = this.EXPIRY_DAYS * 24 * 60 * 60 * 1000; // 5 jours en ms
    
    const beforeCount = this.notifications.length;
    this.notifications = this.notifications.filter(notif => {
      const notifTime = new Date(notif.timestamp).getTime();
      return (now - notifTime) < expiryTime;
    });
    
    const afterCount = this.notifications.length;
    if (beforeCount !== afterCount) {
      console.log(`🧹 Nettoyage: ${beforeCount - afterCount} notifications expirées supprimées`);
      this.save();
    }
  }

  // Ajouter une notification (sans duplication)
  add(notification) {
    // Vérifier si la notification existe déjà (par ID ou par contenu)
    const isDuplicate = this.notifications.some(existing => {
      // Si les deux ont un ID, comparer les ID
      if (existing.id && notification.id) {
        return existing.id === notification.id;
      }
      
      // Sinon, comparer le contenu sur une période de 5 minutes
      const timeDiff = Math.abs(new Date(existing.timestamp) - new Date(notification.timestamp));
      const isSameContent = existing.title === notification.title && 
                           existing.body === notification.body &&
                           existing.type === notification.type;
      
      return isSameContent && timeDiff < 5 * 60 * 1000; // 5 minutes
    });

    if (!isDuplicate) {
      // Ajouter un ID unique si pas présent
      if (!notification.id) {
        notification.id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Ajouter timestamp si pas présent
      if (!notification.timestamp) {
        notification.timestamp = new Date().toISOString();
      }
      
      // Ajouter en tête (plus récent en premier)
      this.notifications.unshift(notification);
      this.save();
      
      // Nettoyer après ajout
      this.cleanExpired();
      
      return true; // Notification ajoutée
    }
    
    return false; // Doublon, non ajoutée
  }

  // Marquer comme lue
  markAsRead(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      notification.read = true;
      notification.readAt = new Date().toISOString();
      this.save();
      return true;
    }
    return false;
  }

  // Marquer toutes comme lues
  markAllAsRead() {
    let count = 0;
    this.notifications.forEach(notif => {
      if (!notif.read) {
        notif.read = true;
        notif.readAt = new Date().toISOString();
        count++;
      }
    });
    if (count > 0) {
      this.save();
    }
    return count;
  }

  // Supprimer une notification
  delete(id) {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  // Supprimer toutes les notifications
  deleteAll() {
    this.notifications = [];
    this.save();
  }

  // Obtenir les notifications non lues
  getUnread() {
    return this.notifications.filter(n => !n.read);
  }

  // Obtenir toutes les notifications (triées par date)
  getAll() {
    return this.notifications;
  }

  // Obtenir le nombre de notifications non lues
  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  // Obtenir les notifications filtrées par type
  getByType(type) {
    if (type === 'all') return this.notifications;
    return this.notifications.filter(n => n.type === type);
  }

  // Obtenir les notifications pour un enfant spécifique
  getByChild(childId) {
    if (!childId || childId === 'all') return this.notifications;
    return this.notifications.filter(n => n.childId === childId);
  }

  // Nettoyer manuellement
  cleanup() {
    this.cleanExpired();
  }
}

// Créer une instance globale
window.notificationStore = new NotificationStore();