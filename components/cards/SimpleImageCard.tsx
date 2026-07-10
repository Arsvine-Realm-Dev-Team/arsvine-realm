import React from 'react';
import styles from '../../styles/SimpleImageCard.module.scss';
import { resolveImageUrl } from '../../lib/cdn';

const SimpleImageCard = ({ title, imageUrl }) => {
  const backgroundImageUrl = resolveImageUrl(imageUrl, 'card');
  const imageStyle = backgroundImageUrl ? { backgroundImage: `url(${backgroundImageUrl})` } : {};

  return (
    <div className={styles.cardContainer} data-cursor-no-magnetic>
      <div className={styles.cardImage} style={imageStyle}>
        {!backgroundImageUrl && <span className={styles.placeholderText}>No Image</span>}
      </div>
      <h4 className={styles.cardTitle}>{title}</h4>
    </div>
  );
};

export default SimpleImageCard; 
