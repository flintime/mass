import type { Service } from '@/types/service';

export const services = {
  // Get service details
  getService: async (id: string | number): Promise<Service> => {
    const response = await fetch(`/services/${id}`);
    return response.json();
  },

  // Get related services
  getRelatedServices: async (id: string | number, limit: number = 3): Promise<Service[]> => {
    const response = await fetch(`/services/${id}/related?limit=${limit}`);
    return response.json();
  },

  // Toggle favorite status
  toggleFavorite: async (id: string | number): Promise<{ isFavorite: boolean }> => {
    const response = await fetch(`/services/${id}/favorite`, {
      method: 'POST',
    });
    return response.json();
  },

  // Submit a review
  submitReview: async (id: string | number, data: {
    rating: number;
    comment: string;
    images?: File[];
  }) => {
    const formData = new FormData();
    formData.append('rating', data.rating.toString());
    formData.append('comment', data.comment);
    if (data.images) {
      data.images.forEach((image, index) => {
        formData.append(`images[${index}]`, image);
      });
    }

    const response = await fetch(`/services/${id}/reviews`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit review');
    }

    return response.json();
  },

  // Get service reviews
  getReviews: async (id: string | number, page: number = 1, limit: number = 10) => {
    const response = await fetch(`/services/${id}/reviews?page=${page}&limit=${limit}`);
    return response.json();
  },

  // Share service
  shareService: async (id: string | number, platform: 'facebook' | 'twitter' | 'whatsapp' | 'email') => {
    const service = await services.getService(id);
    const url = `http://flintime.com/${service.unique_id || service.business_id}`;
    const text = `Check out ${service.name} on Flintime`;

    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank');
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${text}\n${url}`)}`;
        break;
    }
  },

  // Compare services
  compareServices: async (ids: (string | number)[]): Promise<Service[]> => {
    const response = await fetch(`/services/compare?ids=${ids.join(',')}`);
    return response.json();
  }
}; 