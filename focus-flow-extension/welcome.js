document.addEventListener('DOMContentLoaded', () => {
  const btnGetStarted = document.getElementById('btn-get-started');
  const btnSeeFeatures = document.getElementById('btn-see-features');

  if (btnGetStarted) {
    btnGetStarted.addEventListener('click', () => {
      document.getElementById('install').scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (btnSeeFeatures) {
    btnSeeFeatures.addEventListener('click', () => {
      document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
    });
  }
});
