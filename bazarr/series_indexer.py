import os
import re
import logging
import tmdbsimple as tmdb
from database import database

tmdb.API_KEY = 'e5577e69d409c601acb98d5bfcee31c7'


def list_series_directories(root_dir):
    series_directories = []

    try:
        root_dir_path = database.execute("SELECT path FROM table_rootdir WHERE id=?", (root_dir,),
                                         only_one=True)['path']
    except:
        pass
    else:
        for i, directory_temp in enumerate(os.listdir(root_dir_path)):
            directory_original = re.sub(r"\(\b(19|20)\d{2}\b\)", '', directory_temp).rstrip()
            directory = re.sub(r"\s\b(19|20)\d{2}\b", '', directory_original).rstrip()
            if directory.endswith(', The'):
                directory = 'The ' + directory.rstrip(', The')
            elif directory.endswith(', A'):
                directory = 'A ' + directory.rstrip(', A')
            if not directory.startswith('.'):
                series_directories.append(
                    {
                        'directory': directory_original,
                        'root_dir': root_dir
                    }
                )
    finally:
        return series_directories


def get_series_match(directory):
    search = tmdb.Search()
    try:
        series_temp = search.tv(query=directory)
    except Exception as e:
        logging.exception('BAZARR is facing issues index series: {0}'.format(repr(e)))
    else:
        matching_series = []
        if series_temp['total_results']:
            for item in series_temp['results']:
                year = None
                if 'first_air_date' in item:
                    year = item['first_air_date'][:4]
                matching_series.append(
                    {
                        'title': item['name'],
                        'year': year,
                        'tmdbid': item['id']
                    }
                )
        return matching_series


def get_series_metadata(tmdbid):
    series_metadata = {}
    if tmdbid:
        try:
            tmdbSeries = tmdb.TV(id=tmdbid)
            series_info = tmdbSeries.info()
            alternative_titles = tmdbSeries.alternative_titles()
            external_ids = tmdbSeries.external_ids()
        except Exception as e:
            logging.exception('BAZARR is facing issues index series: {0}'.format(repr(e)))
        else:
            images_url = 'https://image.tmdb.org/t/p/original{0}'

            series_metadata = {
                'title': series_info['name'],
                'year': series_info['first_air_date'][:4],
                'tmdb_id': tmdbid,
                'overview': series_info['overview'],
                'poster': images_url.format(series_info['poster_path']),
                'fanart': images_url.format(series_info['backdrop_path']),
                'alternative_titles': [x['title'] for x in alternative_titles['results']],
                'tvdb_id': external_ids['tvdb_id']
            }

        return series_metadata
