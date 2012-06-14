class AddLeftSideBarToSites < ActiveRecord::Migration
  def self.up
   add_column :sites, :side_bar_left, :boolean
  end

  def self.downa
   remove_column :sites, :side_bar_left
  end
end
