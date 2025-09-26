// Сервис для геокодирования адресов через Yandex Maps API
import axios from 'axios';
import { config } from '../../config/config';
import { ExternalServiceError } from '../../common/errors';
import { Coordinates } from '../../common/types';
import { GeocodeRequest, GeocodeResponse } from './types';

export class GeocodingService {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor() {
    this.apiKey = config.external.yandexMaps.apiKey;
    this.apiUrl = config.external.yandexMaps.apiUrl;
  }

  // Геокодирование адреса (получение координат по адресу)
  async geocodeAddress(request: GeocodeRequest): Promise<GeocodeResponse> {
    try {
      if (!request.address || request.address.trim().length === 0) {
        return { error: 'Адрес не может быть пустым' };
      }

      const params = {
        apikey: this.apiKey,
        geocode: request.address.trim(),
        format: 'json',
        results: 1,
        lang: 'ru_RU'
      };

      const response = await axios.get(this.apiUrl, {
        params,
        timeout: 10000 // 10 секунд
      });

      if (!response.data || !response.data.response) {
        return { error: 'Некорректный ответ от сервиса геокодирования' };
      }

      const geoObjects = response.data.response.GeoObjectCollection?.featureMember;
      
      if (!geoObjects || geoObjects.length === 0) {
        return { error: 'Адрес не найден' };
      }

      const geoObject = geoObjects[0].GeoObject;
      const point = geoObject.Point?.pos;
      
      if (!point) {
        return { error: 'Не удалось получить координаты для указанного адреса' };
      }

      // Yandex возвращает координаты в формате "долгота широта"
      const [longitude, latitude] = point.split(' ').map(Number);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        return { error: 'Некорректные координаты в ответе сервиса' };
      }

      const coordinates: Coordinates = { latitude, longitude };
      const formattedAddress = geoObject.metaDataProperty?.GeocoderMetaData?.text || request.address;

      return {
        coordinates,
        formattedAddress
      };

    } catch (error) {
      console.error('Ошибка геокодирования:', error);
      
      if (axios.isAxiosError(error)) {
        if ((error as any).code === 'ECONNABORTED') {
          return { error: 'Превышено время ожидания ответа от сервиса геокодирования' };
        } else if (error.response?.status === 403) {
          return { error: 'Недействительный API ключ Yandex Maps' };
        } else if (error.response?.status === 429) {
          return { error: 'Превышен лимит запросов к сервису геокодирования' };
        } else if (error.response && error.response.status >= 500) {
          return { error: 'Сервис геокодирования временно недоступен' };
        }
      }

      return { error: 'Ошибка при обращении к сервису геокодирования' };
    }
  }

  // Обратное геокодирование (получение адреса по координатам)
  async reverseGeocode(coordinates: Coordinates): Promise<GeocodeResponse> {
    try {
      if (!coordinates || typeof coordinates.latitude !== 'number' || typeof coordinates.longitude !== 'number') {
        return { error: 'Некорректные координаты' };
      }

      const params = {
        apikey: this.apiKey,
        geocode: `${coordinates.longitude},${coordinates.latitude}`,
        format: 'json',
        results: 1,
        lang: 'ru_RU',
        kind: 'house' // Ищем дома
      };

      const response = await axios.get(this.apiUrl, {
        params,
        timeout: 10000
      });

      if (!response.data || !response.data.response) {
        return { error: 'Некорректный ответ от сервиса геокодирования' };
      }

      const geoObjects = response.data.response.GeoObjectCollection?.featureMember;
      
      if (!geoObjects || geoObjects.length === 0) {
        return { error: 'Адрес не найден для указанных координат' };
      }

      const geoObject = geoObjects[0].GeoObject;
      const formattedAddress = geoObject.metaDataProperty?.GeocoderMetaData?.text;
      
      if (!formattedAddress) {
        return { error: 'Не удалось получить адрес для указанных координат' };
      }

      return {
        coordinates,
        formattedAddress
      };

    } catch (error) {
      console.error('Ошибка обратного геокодирования:', error);
      
      if (axios.isAxiosError(error)) {
        if ((error as any).code === 'ECONNABORTED') {
          return { error: 'Превышено время ожидания ответа от сервиса геокодирования' };
        } else if (error.response?.status === 403) {
          return { error: 'Недействительный API ключ Yandex Maps' };
        } else if (error.response?.status === 429) {
          return { error: 'Превышен лимит запросов к сервису геокодирования' };
        }
      }

      return { error: 'Ошибка при обращении к сервису геокодирования' };
    }
  }

  // Проверка доступности сервиса
  async checkServiceHealth(): Promise<boolean> {
    try {
      // Пробуем геокодировать известный адрес
      const testAddress = 'Москва, Красная площадь, 1';
      const result = await this.geocodeAddress({ address: testAddress });
      
      return !result.error && !!result.coordinates;
    } catch (error) {
      console.error('Ошибка проверки доступности сервиса геокодирования:', error);
      return false;
    }
  }

  // Валидация координат для России
  validateCoordinatesForRussia(coordinates: Coordinates): boolean {
    const { latitude, longitude } = coordinates;
    
    // Примерные границы России
    const russianBounds = {
      minLat: 41.0,
      maxLat: 82.0,
      minLng: 19.0,
      maxLng: 180.0
    };

    return (
      latitude >= russianBounds.minLat &&
      latitude <= russianBounds.maxLat &&
      longitude >= russianBounds.minLng &&
      longitude <= russianBounds.maxLng
    );
  }

  // Расчет расстояния между двумя точками (в километрах)
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Радиус Земли в километрах
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) * Math.cos(this.toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Округляем до 2 знаков после запятой
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Получение информации о районе по координатам
  async getDistrictInfo(coordinates: Coordinates): Promise<{ district?: string; city?: string; region?: string }> {
    try {
      const params = {
        apikey: this.apiKey,
        geocode: `${coordinates.longitude},${coordinates.latitude}`,
        format: 'json',
        results: 1,
        lang: 'ru_RU',
        kind: 'district'
      };

      const response = await axios.get(this.apiUrl, {
        params,
        timeout: 10000
      });

      const geoObjects = response.data?.response?.GeoObjectCollection?.featureMember;
      
      if (!geoObjects || geoObjects.length === 0) {
        return {};
      }

      const geoObject = geoObjects[0].GeoObject;
      const components = geoObject.metaDataProperty?.GeocoderMetaData?.AddressDetails?.Country?.AdministrativeArea;
      
      const result: { district?: string; city?: string; region?: string } = {};
      
      if (components) {
        // Регион
        result.region = components.AdministrativeAreaName;
        
        // Город
        const locality = components.Locality || components.SubAdministrativeArea?.Locality;
        if (locality) {
          result.city = locality.LocalityName;
          
          // Район
          const district = locality.DependentLocality;
          if (district) {
            result.district = district.DependentLocalityName;
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Ошибка получения информации о районе:', error);
      return {};
    }
  }
}